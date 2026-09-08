'use client';

import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock3, MapPinned, Music2, Pause, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import styles from './demo.module.css';

const demoSlides = ['/invite-01.webp', '/invite-03.webp', '/invite-10.webp'];
const weddingAt = new Date('2026-10-25T11:58:00+08:00');
const amapUrl = 'https://surl.amap.com/1nY9E0y1fejz';

function getCountdown() {
  const distance = Math.max(0, weddingAt.getTime() - Date.now());
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };
}

async function postRsvp(guestName: string, attendeeCount: number) {
  const response = await fetch('/api/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestName, attendeeCount }),
  });
  const result = (await response.json()) as { ok?: boolean; message?: string };
  if (!response.ok || !result.ok) throw new Error(result.message || '提交失败，请稍后再试');
}

export default function DemoPage() {
  const [current, setCurrent] = useState(0);
  const [changing, setChanging] = useState(false);
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const [musicOn, setMusicOn] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown);
  const [guestName, setGuestName] = useState('');
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [formMessage, setFormMessage] = useState('');
  const pointerStart = useRef<number | null>(null);
  const musicPlayer = useRef<HTMLAudioElement | null>(null);

  const changeSlide = useCallback((step: 1 | -1) => {
    if (changing) return;
    setDirection(step === 1 ? 'next' : 'previous');
    setChanging(true);
    window.setTimeout(() => {
      setCurrent((value) => (value + step + demoSlides.length) % demoSlides.length);
      setChanging(false);
    }, 430);
  }, [changing]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  async function toggleMusic() {
    const player = musicPlayer.current;
    if (!player) return;
    if (musicOn) {
      player.pause();
      setMusicOn(false);
      return;
    }
    try {
      await player.play();
      setMusicOn(true);
    } catch {
      setMusicOn(false);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.abs(distance) > 48) changeSlide(distance < 0 ? 1 : -1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = guestName.trim();
    if (!normalizedName || normalizedName.length > 40) {
      setFormState('error');
      setFormMessage('请填写宾客姓名');
      return;
    }
    setFormState('sending');
    setFormMessage('');
    try {
      await postRsvp(normalizedName, attendeeCount);
      setFormState('success');
      setFormMessage(attendeeCount === 0 ? '已收到回复，谢谢你告诉我们' : '回执成功，期待婚礼见');
    } catch (error) {
      setFormState('error');
      setFormMessage(error instanceof Error ? error.message : '提交失败，请稍后再试');
    }
  }

  const progress = useMemo(() => `${((current + 1) / demoSlides.length) * 100}%`, [current]);

  return (
    <main className="invitation-shell">
      <audio ref={musicPlayer} src="/wedding-music.mp3" loop preload="metadata" />
      <section className="album-stage" aria-label="三页精简请柬设计 Demo">
        <article
          className="album-cover"
          onClick={() => changeSlide(1)}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStart.current = null; }}
          role="button"
          tabIndex={0}
          aria-label="查看下一页"
        >
          <img
            key={demoSlides[current]}
            className={`album-art ${direction === 'previous' ? styles.settlePrevious : ''} ${changing ? `album-art--changing album-art--${direction}` : ''}`}
            src={demoSlides[current]}
            alt={`三页请柬 Demo 第 ${current + 1} 页`}
          />

          {current === 0 && (
            <div className={styles.combinedCover}>
              <p className={styles.kicker}>WEDDING INVITATION</p>
              <h1>郑柯杨 <span>×</span> 彭丽丹</h1>
              <div className={styles.dateBlock}>
                <p className={styles.month}>十月 · OCTOBER</p>
                <div className={styles.dateNumber}><b>25</b><i>2026</i></div>
                <p className={styles.lunar}>星期日 · 农历丙午年九月十六</p>
                <p className={styles.time}><Clock3 size={15} /> 婚宴时间&nbsp; 11:58</p>
              </div>
            </div>
          )}

          {current === 1 && (
            <div className={styles.combinedDetails}>
              <p className={styles.kicker}>COUNTING DOWN</p>
              <h2>距离我们的婚礼</h2>
              <div className={styles.countdownGrid}>
                {Object.entries(countdown).map(([key, value]) => (
                  <span key={key}>
                    <b>{String(value).padStart(2, '0')}</b>
                    <small>{{ days: '天', hours: '时', minutes: '分', seconds: '秒' }[key]}</small>
                  </span>
                ))}
              </div>
              <div className={styles.venueCard} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                <div className={styles.venueTitle}><MapPinned size={18} /><p><span>WEDDING VENUE</span>土乡土菜西湖宴</p></div>
                <p className={styles.address}>瑞和逸景店 · 二楼 · 富州大道西段1号</p>
                <a href={amapUrl} target="_blank" rel="noreferrer">高德地图导航 <ChevronRight size={13} /></a>
              </div>
            </div>
          )}

          {current === 2 && (
            <div className="rsvp-panel" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
              {formState === 'success' ? (
                <div className="rsvp-success" role="status">
                  <span><Check size={28} /></span>
                  <h2>回执已收到</h2>
                  <p>{formMessage}</p>
                  <Button type="button" onClick={() => setFormState('idle')}>修改回执</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <p className="small-red">RSVP</p>
                  <h2>期待与你相见</h2>
                  <label htmlFor="demo-guest-name">宾客姓名</label>
                  <Input id="demo-guest-name" value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={40} placeholder="请输入姓名" required />
                  <label htmlFor="demo-attendee-count">出席人数</label>
                  <NativeSelect id="demo-attendee-count" value={attendeeCount} onChange={(event) => setAttendeeCount(Number(event.target.value))} className="rsvp-select">
                    {Array.from({ length: 11 }, (_, count) => <NativeSelectOption key={count} value={count}>{count === 0 ? '0 人（无法出席）' : `${count} 人`}</NativeSelectOption>)}
                  </NativeSelect>
                  <Button type="submit" disabled={formState === 'sending'}>
                    <Users size={16} /> {formState === 'sending' ? '正在提交…' : '提交回执'}
                  </Button>
                  {formState === 'error' && <p className="form-error" role="alert">{formMessage}</p>}
                </form>
              )}
            </div>
          )}
        </article>

        <div className="player-strip">
          <button onClick={() => changeSlide(-1)} aria-label="上一页"><ChevronLeft /></button>
          <button className="music-button" onClick={toggleMusic} aria-label={musicOn ? '暂停音乐' : '播放音乐'} aria-pressed={musicOn}>
            {musicOn ? <Pause /> : <Music2 />}
            <span>{musicOn ? '请柬音乐 · 播放中' : '轻触播放音乐'}</span>
          </button>
          <span className="player-line"><i style={{ width: progress }} /></span>
          <span className="track-number">{String(current + 1).padStart(2, '0')} / 03</span>
          <button onClick={() => changeSlide(1)} aria-label="下一页"><ChevronRight /></button>
        </div>

        <a className={styles.backLink} href="/">返回当前方案</a>
      </section>
    </main>
  );
}

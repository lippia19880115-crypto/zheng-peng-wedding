'use client';

import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Images, MapPinned, Music2, Pause, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import styles from './demo/demo.module.css';

type SlideKind = 'cover' | 'details' | 'rsvp' | 'invitation' | 'direction' | 'ordinary' | 'days' | 'promise' | 'future' | 'ending';
type Slide = { src: string; kind: SlideKind };

type ModelContextTool = {
  registerTool: (
    tool: {
      name: string;
      title?: string;
      description: string;
      inputSchema: object;
      annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
      execute: (input: unknown) => unknown | Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

declare global {
  interface Document {
    readonly modelContext?: ModelContextTool;
  }
}

const mainSlides: Slide[] = [
  { src: '/invite-01.webp', kind: 'cover' },
  { src: '/invite-03.webp', kind: 'details' },
  { src: '/invite-10.webp', kind: 'rsvp' },
];

const moreSlides: Slide[] = [
  { src: '/invite-04.webp', kind: 'invitation' },
  { src: '/invite-05.webp', kind: 'direction' },
  { src: '/invite-06.webp', kind: 'ordinary' },
  { src: '/invite-07.webp', kind: 'days' },
  { src: '/invite-08.webp', kind: 'promise' },
  { src: '/invite-09.webp', kind: 'future' },
  { src: '/invite-11.webp', kind: 'ending' },
];

const weddingAt = new Date('2026-10-25T11:58:00+08:00');
const amapUrl = 'https://surl.amap.com/1nY9E0y1fejz';
const rsvpApiBase = (process.env.NEXT_PUBLIC_RSVP_API_URL ?? 'https://api.lippialab.top').replace(/\/$/, '');

function getCountdown() {
  const distance = Math.max(0, weddingAt.getTime() - Date.now());
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };
}

async function postRsvp(guestName: string, attendeeCount: number, company = '') {
  const response = await fetch(`${rsvpApiBase}/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestName, attendeeCount, company }),
  });
  const result = (await response.json()) as { ok?: boolean; updated?: boolean; message?: string };
  if (!response.ok || !result.ok) throw new Error(result.message || '提交失败，请稍后再试');
  return result;
}

export default function Home() {
  const [mode, setMode] = useState<'main' | 'more'>('main');
  const [current, setCurrent] = useState(0);
  const [changing, setChanging] = useState(false);
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const [musicOn, setMusicOn] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown);
  const [guestName, setGuestName] = useState('');
  const [company, setCompany] = useState('');
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [formMessage, setFormMessage] = useState('');
  const pointerStart = useRef<number | null>(null);
  const musicPlayer = useRef<HTMLAudioElement | null>(null);
  const slides = mode === 'main' ? mainSlides : moreSlides;
  const activeSlide = slides[current];

  const changeSlide = useCallback((step: 1 | -1) => {
    if (changing) return;
    setDirection(step === 1 ? 'next' : 'previous');
    setChanging(true);
    window.setTimeout(() => {
      setCurrent((value) => (value + step + slides.length) % slides.length);
      setChanging(false);
    }, 430);
  }, [changing, slides.length]);

  useEffect(() => {
    if (activeSlide.kind !== 'details') return;
    setCountdown(getCountdown());
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setCountdown(getCountdown());
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [activeSlide.kind]);

  useEffect(() => {
    const nearbyIndexes = [
      (current - 1 + slides.length) % slides.length,
      (current + 1) % slides.length,
    ];
    nearbyIndexes.forEach((index) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = slides[index].src;
    });
  }, [current, mode, slides]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') changeSlide(1);
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') changeSlide(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeSlide]);

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

  const submitRsvp = useCallback(async (name: string, count: number, honeypot = '') => {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 40 || !Number.isInteger(count) || count < 0 || count > 10) {
      throw new Error('请填写姓名，并选择 0–10 人');
    }
    setGuestName(normalizedName);
    setAttendeeCount(count);
    setFormState('sending');
    setFormMessage('');
    try {
      const result = await postRsvp(normalizedName, count, honeypot);
      setFormState('success');
      setFormMessage(
        result.updated
          ? `已更新为 ${count} 人，以本次填写为准`
          : count === 0 ? '已收到回复，谢谢你告诉我们' : '回执成功，期待婚礼见',
      );
      return { ok: true, guestName: normalizedName, attendeeCount: count };
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交失败，请稍后再试';
      setFormState('error');
      setFormMessage(message);
      throw new Error(message);
    }
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'submit_wedding_rsvp',
      title: '提交婚礼回执',
      description: '为郑柯杨与彭丽丹的婚礼提交宾客姓名和出席人数。无法出席时人数填 0。',
      inputSchema: {
        type: 'object',
        properties: {
          guestName: { type: 'string', minLength: 1, maxLength: 40, description: '宾客姓名' },
          attendeeCount: { type: 'integer', minimum: 0, maximum: 10, description: '出席人数，无法出席填 0' },
        },
        required: ['guestName', 'attendeeCount'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const value = input as { guestName?: unknown; attendeeCount?: unknown };
        if (typeof value?.guestName !== 'string' || typeof value?.attendeeCount !== 'number') {
          throw new Error('姓名必须为文字，出席人数必须为数字');
        }
        return submitRsvp(value.guestName, value.attendeeCount);
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [submitRsvp]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { await submitRsvp(guestName, attendeeCount, company); } catch { /* form displays the error */ }
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

  function switchMode(nextMode: 'main' | 'more') {
    if (changing || mode === nextMode) return;
    setDirection(nextMode === 'more' ? 'next' : 'previous');
    setChanging(true);
    window.setTimeout(() => {
      setMode(nextMode);
      setCurrent(0);
      setChanging(false);
    }, 430);
  }

  const progress = useMemo(() => `${((current + 1) / slides.length) * 100}%`, [current, slides.length]);

  return (
    <main className="invitation-shell">
      <audio ref={musicPlayer} src="/wedding-music.mp3" loop preload="metadata" />
      <section className="album-stage" aria-label="郑柯杨与彭丽丹的婚礼请柬">
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
            key={`${mode}-${activeSlide.src}`}
            className={`album-art ${direction === 'previous' ? styles.settlePrevious : ''} ${changing ? `album-art--changing album-art--${direction}` : ''}`}
            src={activeSlide.src}
            alt={`${mode === 'main' ? '三页请柬' : '更多故事'}第 ${current + 1} 页`}
            decoding="async"
            draggable={false}
          />

          {activeSlide.kind === 'cover' && (
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

          {activeSlide.kind === 'details' && (
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

          {activeSlide.kind === 'rsvp' && (
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
                  <div className="rsvp-honeypot" aria-hidden="true">
                    <label htmlFor="company">单位</label>
                    <input id="company" name="company" value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>
                  <p className="small-red">RSVP</p>
                  <h2>期待与你相见</h2>
                  <label htmlFor="guest-name">宾客姓名</label>
                  <Input id="guest-name" value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={40} placeholder="请输入姓名" required />
                  <label htmlFor="attendee-count">出席人数</label>
                  <NativeSelect id="attendee-count" value={attendeeCount} onChange={(event) => setAttendeeCount(Number(event.target.value))} className="rsvp-select">
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

          {activeSlide.kind === 'invitation' && (
            <div className="cover-copy letter-copy">
              <p className="small-red">TO OUR DEAREST</p>
              <h2>我们结婚啦</h2>
              <p>从今天起，四季三餐，灯火可亲。<br />诚邀你来见证我们的幸福时刻。</p>
              <p className="signature">郑柯杨 & 彭丽丹</p>
            </div>
          )}

          {activeSlide.kind === 'direction' && (
            <div className="cover-copy quote-copy">
              <p>爱不是彼此凝望<br />而是一起望向同一个方向</p>
              <span>WALK WITH ME</span>
            </div>
          )}

          {activeSlide.kind === 'ordinary' && (
            <div className="cover-copy lyric-copy">
              <p>爱让平凡的日子<br />有了共同的名字</p>
              <span>OUR EVERYDAY</span>
            </div>
          )}

          {activeSlide.kind === 'days' && (
            <div className="cover-copy lyric-copy lyric-copy--page7">
              <p>日子渺小重复<br />却都是幸福</p>
              <span>SUMMER, YES</span>
            </div>
          )}

          {activeSlide.kind === 'promise' && (
            <div className="cover-copy mini-copy mini-copy--page8">
              <CalendarDays size={20} />
              <p>岁岁年年<br />我们并肩向前</p>
            </div>
          )}

          {activeSlide.kind === 'future' && (
            <div className="cover-copy lyric-copy lyric-copy--right">
              <p>往后余生<br />请多指教</p>
              <span>TOGETHER, ALWAYS</span>
            </div>
          )}

          {activeSlide.kind === 'ending' && (
            <div className="cover-copy ending-copy">
              <p className="small-red">SEE YOU THERE</p>
              <h2>囍</h2>
              <p>良辰已定 · 敬备喜宴<br />期待与你共同分享这份喜悦</p>
              <span>郑柯杨 & 彭丽丹</span>
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
          <span className="track-number">{String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
          <button onClick={() => changeSlide(1)} aria-label="下一页"><ChevronRight /></button>
        </div>

        {mode === 'main' && current === mainSlides.length - 1 && (
          <button className="mode-button mode-button--more" type="button" onClick={() => switchMode('more')}>
            <Images size={15} /> 查看更多 · 我们的故事
          </button>
        )}

        {mode === 'more' && (
          <button className="mode-button mode-button--back" type="button" onClick={() => switchMode('main')}>
            <ChevronLeft size={15} /> 返回三页请柬
          </button>
        )}

      </section>
    </main>
  );
}

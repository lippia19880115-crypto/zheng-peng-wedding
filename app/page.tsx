'use client';

import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock3, Images, MapPinned, Music2, Pause, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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

const allSlides = Array.from({ length: 11 }, (_, index) => `/invite-${String(index + 1).padStart(2, '0')}.png`);
const primarySlides = allSlides.slice(0, 4);
const gallerySlides = allSlides.slice(4);
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
  return result;
}

export default function Home() {
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
      setCurrent((value) => (value + step + primarySlides.length) % primarySlides.length);
      setChanging(false);
    }, 430);
  }, [changing]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    allSlides.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

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

  const submitRsvp = useCallback(async (name: string, count: number) => {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 40 || !Number.isInteger(count) || count < 0 || count > 10) {
      throw new Error('请填写姓名，并选择 0–10 人');
    }
    setGuestName(normalizedName);
    setAttendeeCount(count);
    setFormState('sending');
    setFormMessage('');
    try {
      await postRsvp(normalizedName, count);
      setFormState('success');
      setFormMessage(count === 0 ? '已收到回复，谢谢你告诉我们' : '回执成功，期待婚礼见');
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
    try { await submitRsvp(guestName, attendeeCount); } catch { /* form displays the error */ }
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

  const progress = useMemo(() => `${((current + 1) / primarySlides.length) * 100}%`, [current]);

  return (
    <main className="invitation-shell">
      <audio ref={musicPlayer} src="/wedding-music.mp3" loop preload="metadata" />
      <section className="album-stage" aria-label="郑柯杨与彭丽丹的婚礼请柬">
        <div className={`vinyl-record ${musicOn ? 'vinyl-record--playing' : ''} ${changing ? 'vinyl-record--changing' : ''}`} aria-hidden="true">
          <span className="vinyl-label">Z · P</span>
        </div>

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
            key={primarySlides[current]}
            className={`album-art ${changing ? `album-art--changing album-art--${direction}` : ''}`}
            src={primarySlides[current]}
            alt={`婚礼请柬第 ${current + 1} 页`}
          />

          {current === 0 && (
            <div className="cover-copy cover-copy--hero">
              <p className="cover-kicker">WEDDING INVITATION</p>
              <h1>郑柯杨 <span>×</span> 彭丽丹</h1>
              <p className="cover-date">2026.10.25 · 11:58</p>
              <p className="seal">囍</p>
            </div>
          )}

          {current === 2 && (
            <div className="cover-copy countdown-copy">
              <p className="small-red">SAVE THE DATE</p>
              <h2>距离我们的婚礼</h2>
              <div className="countdown-grid">
                {Object.entries(countdown).map(([key, value]) => (
                  <span key={key}><b>{String(value).padStart(2, '0')}</b><small>{{ days: '天', hours: '时', minutes: '分', seconds: '秒' }[key]}</small></span>
                ))}
              </div>
              <p className="lunar-date">2026年10月25日 · 农历丙午年九月十六</p>
              <div className="info-row"><Clock3 size={17} /> 婚宴时间 11:58</div>
            </div>
          )}

          {current === 3 && (
            <div className="cover-copy location-copy">
              <div className="location-title">
                <MapPinned size={23} />
                <div><p className="small-red">WEDDING VENUE</p><h2>土乡土菜西湖宴</h2></div>
              </div>
              <p className="address">瑞和逸景店 · 二楼<br />富州大道西段1号</p>
              <a href={amapUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                打开高德地图导航 <ChevronRight size={16} />
              </a>
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
          <span className="track-number">{String(current + 1).padStart(2, '0')} / {primarySlides.length}</span>
          <button onClick={() => changeSlide(1)} aria-label="下一页"><ChevronRight /></button>
        </div>

        <div className="page-dots" aria-label="请柬页码">
          {primarySlides.map((_, index) => (
            <button key={index} className={index === current ? 'active' : ''} onClick={() => {
              if (index === current || changing) return;
              setDirection(index > current ? 'next' : 'previous');
              setChanging(true);
              window.setTimeout(() => { setCurrent(index); setChanging(false); }, 430);
            }} aria-label={`前往第 ${index + 1} 页`} />
          ))}
        </div>

        <Sheet>
          <SheetTrigger className="more-button"><Images size={15} /> 查看更多 · 相册与回执</SheetTrigger>
          <SheetContent side="bottom" className="more-sheet">
            <div className="more-sheet-heading">
              <SheetTitle>我们的故事</SheetTitle>
              <SheetDescription>继续往下看，也请告诉我们你是否到场。</SheetDescription>
            </div>
            <div className="more-scroll">
              <div className="more-gallery">
                {gallerySlides.map((src, index) => (
                  <figure key={src}>
                    <img src={src} alt={`郑柯杨与彭丽丹的婚礼照片 ${index + 1}`} loading="lazy" />
                  </figure>
                ))}
              </div>

              <section className="more-rsvp" aria-label="婚礼出席回执">
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
              </section>
              <p className="more-ending">良辰已定 · 敬备喜宴<br /><span>郑柯杨 & 彭丽丹</span></p>
            </div>
          </SheetContent>
        </Sheet>

        <p className="gesture-hint">向左滑下一张 · 向右滑上一张</p>
      </section>
    </main>
  );
}

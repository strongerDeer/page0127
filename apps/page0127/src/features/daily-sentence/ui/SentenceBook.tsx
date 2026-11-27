'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { createPortal } from 'react-dom';

import Image from 'next/image';
import Link from 'next/link';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { dailyScore, formatSentenceSource } from '@/entities/daily-sentence';

import { ShareSheetButton } from '@/features/share';

import { useDailySentenceDraw } from '../model/useDailySentenceDraw';
import { CarrotSvg } from './CarrotSvg';

import type { TodaySentenceState } from '../api/getTodaySentenceState';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

import styles from './SentenceBook.module.css';

/**
 * 연출 시간표(ms) — 당근 쏙(0) → 표지 넘김·책장 후루룩(0.4s~) → 펼친 면 문장 → 그 쪽으로 확대(3.4s) → 종이 쪽(3.9s)
 * 응답이 늦으면 확대를 응답까지 미룬다. 모션 줄이기면 건너뛴다.
 */
const OPEN_AT = 400;
const ZOOM_AT = 3400;
const RESULT_AFTER_ZOOM = 500;
/** 넘어가는 책장 수와 간격 — 간격이 점점 짧아져 후루룩 빨라진다 */
const FLIPS = 12;
/** 당근을 이만큼(px) 위로 끌면 쑥 뽑힌다. 그 전엔 뻑뻑하게 */
const PULL_DISTANCE = 110;

type Phase = 'closed' | 'pulled' | 'open' | 'zoom' | 'result';

type SentenceBookProps = TodaySentenceState & {
  /** page: /sentence 전체 화면 · modal: 서재 배너에서 연 모달 */
  variant: 'page' | 'modal';
  /** 모달 닫기 — 회원이 뽑은 뒤 "닫기" 버튼 */
  onClose?: () => void;
  /**
   * 열리자마자 당근을 뽑는다 — 홈 당근을 누르면 모달에서 한 번 더 누르지 않고 바로 펼친다(HJ 11/24).
   * 오늘 이미 뽑았으면 그냥 결과를 보여 준다.
   */
  autoStart?: boolean;
};

/** 모달이 떠오르는 동안(약 0.2초)은 기다렸다가 당근을 뽑는다 */
const AUTO_START_MS = 350;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 공유 이미지를 그리는 동안 — 문장 한 장이라 금방 끝난다 */
const SENTENCE_LOADING = {
  title: '오늘의 문장을 옮겨 적고 있어요',
  wait: '종이에 문장을 적는 중…',
  slow: '당근을 꽂는 중이에요. 조금만 기다려 주세요.',
};

/** 점수 구간 색 — 90↑ 브랜드 파랑, 80대 민트, 70대 보라 */
const scoreTone = (value: number) =>
  value >= 90 ? 'best' : value >= 80 ? 'good' : 'okay';

const flipDelays = Array.from({ length: FLIPS }, (_, i) => {
  let delay = 0.95;
  for (let k = 0; k < i; k += 1) delay += Math.max(0.045, 0.17 - k * 0.014);
  return delay;
});

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

/** 오늘(KST 'YYYY-MM-DD')이 든 주의 월~일 날짜 */
const weekOf = (todayKey: string) => {
  const today = new Date(`${todayKey}T00:00:00Z`);
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - mondayOffset + i);
    return d.toISOString().slice(0, 10);
  });
};

/** 다음 문장(한국 시간 자정)까지 — 시·분만(HJ 11/24 "초는 과하다") */
const untilNextSentence = () => {
  const kstNow = Date.now() + 9 * 3_600_000;
  const minutes = Math.max(
    1,
    Math.ceil((86_400_000 - (kstNow % 86_400_000)) / 60_000)
  );
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}시간 ${m}분` : `${m}분`;
};

const subscribeTimer = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};

/** 종이 결 — 홈처럼 캔버스 노이즈를 한 번 만들어 배경으로 쓴다 */
const makeGrain = () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 200 + Math.random() * 55;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return `url(${canvas.toDataURL()})`;
};

/**
 * 오늘의 문장 — 당근을 뽑으면 책이 펼쳐진다 (Client Component, HJ 2026-11-24 랜딩 시안 v5)
 *
 * /sentence 페이지와 서재 모달이 같은 컴포넌트를 쓴다(인터랙션 일관성 — HJ 11/24).
 * 오늘 이미 뽑았으면(회원=DB, 비회원=이 브라우저) 표지·당근 없이 바로 결과 쪽을 연다.
 * 문장 받아 오기·점수·기록은 useDailySentenceDraw 가 맡고, 여기서는 연출과 화면만 그린다.
 */
export const SentenceBook = ({
  memberId,
  today,
  todayBookHref,
  drawDates,
  libraryHref,
  variant,
  onClose,
  autoStart = false,
}: SentenceBookProps) => {
  const place = variant === 'modal' ? 'modal' : 'landing';
  const { result, score, seed, todayKey, guestDays, fetchDraw, commit } =
    useDailySentenceDraw({
      memberId,
      today,
      todayBookHref,
      place,
    });
  const [, startTransition] = useTransition();

  const [phase, setPhase] = useState<Phase>('closed');
  // 막 뽑았는지 — 막 뽑았을 때만 결과가 하나씩 떠오른다(다시 열면 바로)
  const [justDrawn, setJustDrawn] = useState(false);
  // 펼친 면 첫 쪽에 비칠 문장(응답이 연출보다 빨리 오면 보인다)
  const [peek, setPeek] = useState<string | null>(null);
  const [fly, setFly] = useState<CSSProperties | null>(null);
  const [sparks, setSparks] = useState<CSSProperties[]>([]);
  const [copied, setCopied] = useState<'idle' | 'done' | 'blocked'>('idle');
  const [swipeKey, setSwipeKey] = useState(0);
  // 새 문장까지 남은 시간 — 30초마다 다시 읽는다. 서버 HTML 엔 없다(시각이 다르므로)
  const timer = useSyncExternalStore(
    subscribeTimer,
    untilNextSentence,
    () => null
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const carrotRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ y0: number; dy: number; pointerId: number } | null>(
    null
  );
  const skipClick = useRef(false);

  // 결과가 있으면(오늘 이미 뽑음) 표지 없이 바로 결과 쪽
  const shown: Phase = result && phase === 'closed' ? 'result' : phase;

  useEffect(() => {
    const grain = makeGrain();
    if (grain) rootRef.current?.style.setProperty('--grain', grain);
  }, []);

  useEffect(() => {
    if (copied === 'idle') return;
    const id = setTimeout(() => {
      setCopied('idle');
      setSwipeKey(0);
    }, 3200);
    return () => clearTimeout(id);
  }, [copied]);

  const launchCarrot = () => {
    const carrot = carrotRef.current;
    const desk = deskRef.current;
    if (!carrot || !desk) return;
    const r = carrot.getBoundingClientRect();
    const d = desk.getBoundingClientRect();
    // 화면 위로 너무 나가지 않게 — 머리글 위에서 멈춰 보이게
    const up = Math.max(70, Math.min(r.top - 4, 170));
    setFly({
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      '--up': `${up}px`,
    } as CSSProperties);
    setSparks(
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return {
          left: r.left - d.left + r.width / 2,
          top: r.top - d.top + 12,
          '--dx': `${Math.cos(a) * 54}px`,
          '--dy': `${Math.sin(a) * 54}px`,
        } as CSSProperties;
      })
    );
    setTimeout(() => {
      setFly(null);
      setSparks([]);
    }, 1000);
  };

  // 자동 시작 — 타이머가 도는 동안 바뀐 최신 상태로 판단하려고 ref 로 넘긴다
  const latest = useRef({ open: () => {}, drawn: false });
  useEffect(() => {
    if (!autoStart) return;
    const id = setTimeout(() => {
      if (!latest.current.drawn) latest.current.open();
    }, AUTO_START_MS);
    return () => clearTimeout(id);
  }, [autoStart]);

  const open = () => {
    if (phase !== 'closed') return;
    const reduced = prefersReducedMotion();
    if (!reduced) launchCarrot();
    setPhase('pulled');
    startTransition(async () => {
      const request = fetchDraw().then((outcome) => {
        if (outcome.ok) setPeek(outcome.sentence.text);
        return outcome;
      });
      if (!reduced) {
        await wait(OPEN_AT);
        setPhase('open');
      }
      const [outcome] = await Promise.all([
        request,
        wait(reduced ? 0 : ZOOM_AT - OPEN_AT),
      ]);
      if (!outcome.ok) {
        toast.error(outcome.message);
        setPhase('closed');
        return;
      }
      if (!reduced) {
        setPhase('zoom');
        await wait(RESULT_AFTER_ZOOM);
      }
      setJustDrawn(!reduced);
      commit({ sentence: outcome.sentence, bookHref: outcome.bookHref });
      setPhase('result');
    });
  };

  // 당근 끌어당기기 — 처음엔 뻑뻑하게, 일정 거리를 넘으면 쑥
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase !== 'closed') return;
    drag.current = { y0: e.clientY, dy: 0, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragging = '';
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || phase !== 'closed') return;
    d.dy = Math.max(0, d.y0 - e.clientY);
    const lift = d.dy < 60 ? d.dy * 0.35 : 21 + (d.dy - 60) * 0.9;
    e.currentTarget.style.transform = `translateY(${-lift}px) rotate(${6 - Math.min(d.dy, 90) / 7}deg)`;
    if (d.dy > PULL_DISTANCE) {
      // 뽑힌 위치에서 날아가도록 transform 은 launchCarrot 이 읽은 뒤에 지운다
      drag.current = null;
      skipClick.current = true;
      open();
      e.currentTarget.style.transform = '';
      delete e.currentTarget.dataset.dragging;
    }
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    delete e.currentTarget.dataset.dragging;
    e.currentTarget.style.transform = '';
    // 조금 끌다 만 건 클릭으로 치지 않는다(톡 누른 건 클릭으로 펼친다)
    if (d && d.dy >= 6) skipClick.current = true;
  };
  const onCarrotClick = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    open();
  };

  useEffect(() => {
    latest.current = { open, drawn: Boolean(result) };
  });

  const copy = async () => {
    if (!result) return;
    const text = `“${result.sentence.text.replace(/\s*\n\s*/g, ' ')}”\n— ${formatSentenceSource(result.sentence)}\n\n오늘의 문장 · ${window.location.origin}/sentence`;
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    setCopied(ok ? 'done' : 'blocked');
    setSwipeKey((k) => k + 1);
    if (ok)
      trackEvent('daily_sentence_copy', { member: Boolean(memberId), place });
  };

  /** 결과 화면 버튼 — 기존 CTA 위치별 클릭 보고서(cta_click · location)에 함께 쌓인다 */
  const trackCta = (location: string) =>
    trackEvent('cta_click', { location, member: Boolean(memberId), place });

  const dateLabel = `${Number(todayKey.slice(5, 7))}월 ${Number(todayKey.slice(8, 10))}일`;
  const shortDate = `${todayKey.slice(5, 7)}.${todayKey.slice(8, 10)}`;

  // 이번 주 내 기록 — 회원은 DB, 비회원은 이 브라우저
  const drawnSet = new Set(memberId ? drawDates : guestDays);
  if (result) drawnSet.add(todayKey);
  const week = weekOf(todayKey).map((date, i) => ({
    date,
    label: WEEKDAYS[i],
    day: Number(date.slice(8, 10)),
    tone:
      drawnSet.has(date) && seed
        ? scoreTone(dailyScore(date, seed).total)
        : null,
    isToday: date === todayKey,
    isFuture: date > todayKey,
  }));
  const drawnWeek = week.filter((d) => d.tone && seed);
  const average = drawnWeek.length
    ? Math.round(
        drawnWeek.reduce((sum, d) => sum + dailyScore(d.date, seed!).total, 0) /
          drawnWeek.length
      )
    : null;

  const ringLength = 2 * Math.PI * 24;

  return (
    <div ref={rootRef} className={styles.root} data-variant={variant}>
      <div
        ref={deskRef}
        className={styles.desk}
        data-phase={shown}
        data-auto={autoStart ? '' : undefined}
      >
        {shown !== 'result' && (
          <section className={styles.coverScene} aria-label='오늘의 문장 표지'>
            <div className={styles.book}>
              <div className={styles.edges} aria-hidden />
              <div className={styles.inner} aria-hidden>
                <div className={styles.innerHead}>
                  <span>오늘의 문장.</span>
                  <span>{dateLabel}</span>
                </div>
                <p className={styles.innerText}>{peek}</p>
              </div>
              <div className={styles.bubble} aria-hidden>
                당근을 뽑아 보세요!
              </div>
              <button
                ref={carrotRef}
                type='button'
                className={styles.carrot}
                aria-label='당근 뽑고 오늘의 문장 펼치기'
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onClick={onCarrotClick}
                disabled={phase !== 'closed'}
              >
                <CarrotSvg />
              </button>
              <div className={styles.flips} aria-hidden>
                {flipDelays.map((delay, i) => (
                  <i
                    key={delay}
                    className={styles.flip}
                    style={
                      {
                        '--d': `${delay.toFixed(3)}s`,
                        '--end': `${(-176 + i * 0.25).toFixed(2)}deg`,
                        zIndex: 2 + FLIPS - i,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
              <div className={styles.cover} aria-hidden>
                <div className={styles.back} />
                <div className={styles.front}>
                  <div className={styles.hinge} />
                  <p className={styles.title}>
                    책 사이에 끼워 둔
                    <br />
                    오늘의 <em>한 줄</em>
                  </p>
                  <div className={styles.rule}>하루 한 번, 당근을 뽑아요</div>
                  <div className={styles.mark}>{shortDate}</div>
                  <Image
                    className={styles.seal}
                    src='/brand/app-icon-96.webp'
                    alt=''
                    width={34}
                    height={34}
                    unoptimized
                  />
                  <div className={styles.belt}>
                    <small>
                      오늘의 독서운 · {memberId ? '하루 한 번' : '로그인 없이'}
                    </small>
                    <b>
                      “<em>당근</em>을 뽑으면,
                      <br />
                      오늘 나에게 온 문장이 나와요”
                    </b>
                    <span>매일 다른 책 속 한 줄과 오늘의 점수</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.below}>
              <p>책 사이 당근을 위로 끌어당기면 책이 펼쳐져요.</p>
              <button
                type='button'
                className={styles.carrotBtn}
                onClick={open}
                disabled={phase !== 'closed'}
              >
                당근 뽑기
              </button>
              <div className={styles.tip}>
                당근을 끌어당기거나 버튼을 눌러요
              </div>
            </div>
            {sparks.map((style, i) => (
              <i key={i} className={styles.spark} style={style} aria-hidden />
            ))}
          </section>
        )}

        {shown === 'result' && result && (
          <article
            className={styles.leaf}
            data-enter={justDrawn ? '' : undefined}
            aria-labelledby='sentence-quote'
            aria-live='polite'
          >
            <div className={styles.runhead}>
              <span>page0127. 오늘의 문장</span>
              <span>{dateLabel} · 오늘의 독서운</span>
            </div>
            <div className={styles.body}>
              <div className={styles.chap}>오늘의 한 줄</div>
              <p
                id='sentence-quote'
                key={swipeKey}
                className={styles.quote}
                data-swipe={swipeKey ? '' : undefined}
              >
                {result.sentence.text.split('\n').map((line, i, lines) => (
                  <span key={i}>
                    <span
                      className={styles.hl}
                      style={{ '--i': i } as CSSProperties}
                    >
                      {line}
                    </span>
                    {i < lines.length - 1 && (
                      <>
                        {' '}
                        <br />
                      </>
                    )}
                  </span>
                ))}
              </p>
              <p className={styles.src}>
                — {formatSentenceSource(result.sentence)}
              </p>
              {score && (
                <div className={styles.fortune}>
                  <div className={styles.ring}>
                    <svg width='56' height='56' viewBox='0 0 56 56' aria-hidden>
                      <circle
                        className={styles.ringTrack}
                        cx='28'
                        cy='28'
                        r='24'
                        fill='none'
                        strokeWidth='5'
                      />
                      <ScoreArc
                        value={score.total}
                        length={ringLength}
                        animate={justDrawn}
                      />
                    </svg>
                    <b aria-label={`${score.total}점`}>{score.total}</b>
                  </div>
                  <div>
                    <small>오늘의 독서운</small>
                    <span>{score.comment}</span>
                  </div>
                </div>
              )}
              <div className={styles.acts}>
                <button
                  type='button'
                  className={styles.pill}
                  data-done={copied === 'done' ? '' : undefined}
                  onClick={copy}
                >
                  <span className={styles.copyIcon} aria-hidden />
                  {copied === 'done'
                    ? '복사했어요'
                    : copied === 'blocked'
                      ? '복사가 막혔어요'
                      : '문장 복사'}
                </button>
                {/* 공유 — 이미지 주소는 문장 번호 + 점수 + 날짜(HJ A안). 글자는 서버가 번호로 읽는다.
                    링크는 /sentence — 받은 사람이 자기 문장을 뽑는다(내 결과 화면이 아니다) */}
                {score && (
                  <ShareSheetButton
                    path='/sentence'
                    imagePath={`/sentence/story-image?id=${result.sentence.sentence_id}&score=${score.total}&d=${todayKey}`}
                    fileName={`page0127-sentence-${todayKey}.png`}
                    title='오늘의 문장'
                    sheetTitle='오늘의 문장 공유하기'
                    loadingMessages={SENTENCE_LOADING}
                    description='이미지는 스토리에, 링크는 친구가 자기 문장을 뽑아 보기 좋아요.'
                    renderTrigger={(openSheet) => (
                      <button
                        type='button'
                        className={styles.pill}
                        onClick={openSheet}
                      >
                        <Share2 aria-hidden className='size-3.5' />
                        공유
                      </button>
                    )}
                  />
                )}
                {result.bookHref && (
                  <Link
                    className={styles.pill}
                    href={result.bookHref}
                    onClick={() => trackCta('sentence_book')}
                  >
                    이 책 보러 가기
                  </Link>
                )}
              </div>
              <section
                id='rec'
                className={styles.rec}
                aria-label='이번 주 내 기록'
              >
                <div className={styles.recHead}>
                  <b>이번 주 내 기록</b>
                  <span>
                    {drawnWeek.length}번 뽑았어요
                    {average !== null && ` · 평균 ${average}점`}
                  </span>
                </div>
                <ol className={styles.week}>
                  {week.map((d) => (
                    <li
                      key={d.date}
                      className={styles.day}
                      data-today={d.isToday ? '' : undefined}
                      data-future={d.isFuture ? '' : undefined}
                      aria-label={`${d.label}요일 ${d.day}일${d.tone ? ' 뽑음' : ''}`}
                    >
                      <span>{d.label}</span>
                      <b>{d.day}</b>
                      <i data-tone={d.tone ?? undefined} />
                    </li>
                  ))}
                </ol>
                <div className={styles.join}>
                  {memberId ? (
                    <>
                      <p>
                        <b>펼친 문장은 내 서재 캘린더에 남아요.</b>
                      </p>
                      {variant === 'modal' && onClose ? (
                        <button
                          type='button'
                          className={styles.joinBtn}
                          onClick={onClose}
                        >
                          닫기
                        </button>
                      ) : libraryHref ? (
                        <Link
                          className={styles.joinBtn}
                          href={libraryHref}
                          onClick={() => trackCta('sentence_calendar')}
                        >
                          내 서재 캘린더 보기 <span aria-hidden>→</span>
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p>
                        <b>이 기록은 이 브라우저에만 남아요.</b>
                        <br />
                        가입하면 뽑은 문장이 캘린더에 평생 모여요.
                      </p>
                      <Link
                        className={styles.joinBtn}
                        href='/login?next=/sentence'
                        onClick={() => trackCta('sentence_join')}
                      >
                        가입하고 문장 모으기 <span aria-hidden>→</span>
                      </Link>
                    </>
                  )}
                </div>
              </section>
            </div>
            {timer && (
              <div className={styles.foot}>
                <span>
                  새 문장까지 <b>{timer}</b>
                </span>
              </div>
            )}
          </article>
        )}
      </div>

      {fly &&
        createPortal(
          <div className={styles.fly} style={fly} aria-hidden>
            <CarrotSvg />
          </div>,
          document.body
        )}
    </div>
  );
};

/** 원형 게이지 — 막 뽑았으면 0에서 차오른다 */
const ScoreArc = ({
  value,
  length,
  animate,
}: {
  value: number;
  length: number;
  animate: boolean;
}) => {
  const [filled, setFilled] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    // 빈 원이 한 번 그려진 뒤에 채워야 transition 이 걸린다
    const id = setTimeout(() => setFilled(true), 60);
    return () => clearTimeout(id);
  }, [animate]);
  return (
    <circle
      className={styles.ringArc}
      data-tone={scoreTone(value)}
      cx='28'
      cy='28'
      r='24'
      fill='none'
      strokeWidth='5'
      strokeDasharray={length}
      strokeDashoffset={filled ? length * (1 - value / 100) : length}
    />
  );
};

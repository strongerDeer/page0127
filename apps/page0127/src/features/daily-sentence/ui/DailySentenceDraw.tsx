'use client';

import { useEffect, useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { BookCover, Button } from '@repo/ui';
import { BookOpen, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { toKstDateKey } from '@/shared/lib/date';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';

import { dailyScore, formatSentenceSource } from '@/entities/daily-sentence';

import { drawDailySentenceAction } from '../api/drawDailySentenceAction';
import { CarrotSvg } from './CarrotSvg';

import type { DailyScore, DailySentence } from '@/entities/daily-sentence';
import type { CSSProperties, ReactNode } from 'react';

import styles from './DailySentenceBook.module.css';

/**
 * 연출 길이 — HJ 11/24 "화면 너무 빨리 넘어간다"
 * 책장 넘김(서재 카드 2.2초보다 조금 길게) → 다 넘긴 면을 잠깐 → 책이 사라지며 결과로
 */
const OPENING_MS = 2600;
const HOLD_MS = 600;
const LEAVE_MS = 450;
const TURNING_PAGES = 4;
/** 결과가 하나씩 나타나는 간격(점수 → 한마디 → 세 운 → 문장) */
const RISE_STEP_MS = 350;

/** 비회원 브라우저 열쇠 — 오늘의 문장·점수를 "이 브라우저"에 묶는다. 개인정보가 아닌 무작위 문자열 */
const GUEST_KEY = 'page0127:sentence-key';
/** 비회원이 오늘 펼친 결과 — 다시 열면 연출 없이 바로 보여 준다 */
const GUEST_TODAY = 'page0127:sentence-today';

type GuestToday = {
  date: string;
  sentence: DailySentence;
  bookHref: string | null;
} | null;

type DrawState = 'closed' | 'opening' | 'open';

type DailySentenceDrawProps = {
  /** 로그인한 사람 — 있으면 기록하는 뽑기(서버 액션), 없으면 비회원 뽑기(GET /api/sentence/today) */
  memberId: string | null;
  /** 회원이 오늘 이미 펼친 문장(서버가 읽어 준다) */
  today: DailySentence | null;
  todayBookHref: string | null;
  /** 모달 안인지 — 통계와 닫기 버튼에만 쓴다 */
  place: 'modal' | 'page';
  /** 모달 안에서 "닫기" — 없으면 버튼을 그리지 않는다 */
  onClose?: () => void;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const newGuestKey = () => crypto.randomUUID().replaceAll('-', '');

/**
 * 오늘의 문장 뽑기 (Client Component) — /sentence 페이지와 홈·서재 모달이 같이 쓴다.
 *
 * 흐름: 닫힌 남색 책 → [오늘의 문장 펼치기] → 책장 넘김(약 2초) → 오늘의 독서운 + 문장.
 * - 회원: drawDailySentenceAction — 안 본 문장 중 무작위, 캘린더에 기록. 끝나면 router.refresh() 로 뒤 화면(서재 캘린더·배너)을 맞춘다.
 * - 비회원: 브라우저 열쇠로 GET /api/sentence/today — 같은 열쇠·같은 날이면 늘 같은 문장. DB 에 남기지 않는다.
 * - 점수는 날짜 + 사람(회원 id / 브라우저 열쇠)으로 정하는 순수 계산(dailyScore) — 사람마다 다르고, 새로고침해도 같다.
 * 연출과 요청을 Promise.all 로 함께 기다린다 — 응답이 빨라도 책장은 끝까지 넘어간다. 모션 줄이기면 건너뛴다.
 */
export const DailySentenceDraw = ({
  memberId,
  today,
  todayBookHref,
  place,
  onClose,
}: DailySentenceDrawProps) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [guestKey, setGuestKey] = useLocalStorage<string | null>(
    GUEST_KEY,
    null
  );
  const [guestToday, setGuestToday] = useLocalStorage<GuestToday>(
    GUEST_TODAY,
    null
  );

  // 이번 화면에서 펼친 결과 — 회원은 서버가 준 오늘 문장으로 시작한다
  const [drawn, setDrawn] = useState<{
    sentence: DailySentence;
    bookHref: string | null;
  } | null>(today ? { sentence: today, bookHref: todayBookHref } : null);
  const [opening, setOpening] = useState(false);
  // 책장을 다 넘긴 뒤 책이 사라지는 중 — 이때 결과는 아직 안 그린다
  const [leaving, setLeaving] = useState(false);
  // 이번 화면에서 막 펼쳤는지 — 막 펼쳤을 때만 결과를 하나씩 띄운다(다시 열면 바로)
  const [justDrawn, setJustDrawn] = useState(false);

  const todayKey = toKstDateKey(new Date());
  // 비회원이 오늘 이미 펼쳤으면(이 브라우저) 그 결과를 그대로 보여 준다
  const guestResult =
    !memberId && guestToday?.date === todayKey ? guestToday : null;
  const result = drawn ?? guestResult;
  const state: DrawState = result ? 'open' : opening ? 'opening' : 'closed';

  const seed = memberId ?? guestKey;
  const score = result && seed ? dailyScore(todayKey, seed) : null;

  const drawAsGuest = async () => {
    const key = guestKey ?? newGuestKey();
    if (!guestKey) setGuestKey(key);
    const res = await fetch(
      `/api/sentence/today?key=${encodeURIComponent(key)}`
    );
    const body = (await res.json().catch(() => null)) as {
      sentence?: DailySentence;
      bookHref?: string | null;
      error?: string;
    } | null;
    if (!res.ok || !body?.sentence) {
      return {
        ok: false as const,
        message: body?.error ?? '문장을 펼치지 못했어요. 다시 시도해 주세요.',
      };
    }
    setGuestToday({
      date: todayKey,
      sentence: body.sentence,
      bookHref: body.bookHref ?? null,
    });
    return {
      ok: true as const,
      sentence: body.sentence,
      bookHref: body.bookHref ?? null,
    };
  };

  const handleOpen = () => {
    setOpening(true);
    startTransition(async () => {
      const reduced = prefersReducedMotion();
      const [outcome] = await Promise.all([
        memberId ? drawDailySentenceAction() : drawAsGuest(),
        wait(reduced ? 0 : OPENING_MS + HOLD_MS),
      ]);
      if (!outcome.ok) {
        setOpening(false);
        toast.error(outcome.message);
        return;
      }
      if (!reduced) {
        setLeaving(true);
        await wait(LEAVE_MS);
      }
      setOpening(false);
      setLeaving(false);
      setJustDrawn(!reduced);
      setDrawn({ sentence: outcome.sentence, bookHref: outcome.bookHref });
      trackEvent('daily_sentence_draw', { member: Boolean(memberId), place });
      // 뒤 화면(서재 배너·캘린더 책갈피)을 다시 그린다 — 모달이 떠 있어도 그대로 유지된다
      if (memberId) router.refresh();
    });
  };

  const dateLabel = `${Number(todayKey.slice(5, 7))}월 ${Number(todayKey.slice(8, 10))}일`;

  if (state === 'open' && result) {
    // 막 펼쳤으면 하나씩 띄운다 — n 번째 조각의 지연
    const rise = (n: number) =>
      justDrawn
        ? {
            className: styles.rise,
            style: { animationDelay: `${n * RISE_STEP_MS}ms` },
          }
        : {};
    return (
      <section
        aria-labelledby='sentence-draw-heading'
        className='grid gap-5'
        aria-live='polite'
      >
        <p className='flex items-center justify-center gap-1.5 text-xs font-medium text-text-subtle'>
          <CarrotSvg className='h-5 w-3' />
          {dateLabel} · 오늘의 독서운
        </p>

        {score && <ScoreBlock score={score} animate={justDrawn} rise={rise} />}

        <figure
          {...rise(3)}
          className={`${styles.paper} ${rise(3).className ?? ''} grid gap-4 px-5 pt-5 pb-4`}
        >
          <blockquote
            id='sentence-draw-heading'
            className='whitespace-pre-wrap break-keep text-[17px] font-bold leading-[1.75] text-text-strong'
          >
            {result.sentence.text}
          </blockquote>
          <figcaption
            className={`${styles.paperMeta} grid grid-cols-[auto_1fr_auto] items-center gap-3 pt-3 text-[13px] text-text-subtle`}
          >
            <BookCover
              src={result.sentence.cover_image}
              title={result.sentence.book_title}
              author={result.sentence.author}
              size='xs'
              small
              decorative
            />
            <span className='min-w-0'>
              {formatSentenceSource(result.sentence)}
            </span>
            {result.bookHref && (
              <Link
                href={result.bookHref}
                className='inline-flex items-center gap-0.5 whitespace-nowrap font-medium text-text-strong underline-offset-4 hover:underline'
              >
                이 책 보러 가기
                <ChevronRight className='size-4' aria-hidden />
              </Link>
            )}
          </figcaption>
        </figure>

        <div {...rise(4)} className={`${rise(4).className ?? ''} grid gap-2`}>
          {memberId ? (
            onClose ? (
              <Button onClick={onClose}>내 캘린더에 남았어요 · 닫기</Button>
            ) : (
              <p className='text-center text-sm text-text-subtle'>
                펼친 문장은 내 서재 독서 캘린더에 남아요.
              </p>
            )
          ) : (
            <Button asChild>
              <Link href='/login?next=/sentence'>
                가입하고 매일 캘린더에 모으기
              </Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby='sentence-draw-heading'
      className='grid justify-items-center gap-5 text-center'
    >
      <div>
        <p className='text-xs font-medium text-text-subtle'>
          {dateLabel} · 오늘의 문장
        </p>
        <h2
          id='sentence-draw-heading'
          className='mt-1.5 text-xl font-bold text-text-strong'
        >
          오늘, 나에게 온 한 줄
        </h2>
      </div>

      <div
        className={`${styles.stage} ${styles.large} ${styles.creamStage} ${leaving ? styles.leaving : ''}`}
        data-state={state}
        aria-hidden
      >
        {/* 크림 책 + 책장 사이 당근 — 홈 당근 책갈피와 이어지게(HJ 11/24 시안 C) */}
        <div className={`${styles.cover} ${styles.cream}`}>
          <div className={styles.creamPagesBack} />
          <div className={styles.creamCarrot}>
            <CarrotSvg />
          </div>
          <div className={styles.creamPagesFront} />
          <div className={styles.creamFront}>
            <span className={styles.coverTitle}>
              오늘의
              <br />
              문장
            </span>
            <div className={styles.creamMini}>
              <CarrotSvg />
            </div>
          </div>
        </div>
        <div className={styles.spread}>
          <div className={`${styles.page} ${styles.left}`} />
          <div className={`${styles.page} ${styles.right}`} />
          {Array.from({ length: TURNING_PAGES }, (_, i) => (
            <div key={i} className={styles.turning} />
          ))}
        </div>
      </div>

      <Button
        className='w-full'
        onClick={handleOpen}
        disabled={state === 'opening'}
      >
        <BookOpen aria-hidden />
        {state === 'opening' ? '펼치는 중…' : '오늘의 문장 펼치기'}
      </Button>
    </section>
  );
};

type Rise = (n: number) => {
  className?: string;
  style?: CSSProperties;
};

/** 0 → 목표까지 숫자가 올라간다(ease-out). animate 가 아니면 바로 목표값 */
const useCountUp = (target: number, animate: boolean, ms = 700) => {
  const [value, setValue] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, ms]);
  return animate ? value : target;
};

/** 막 그려졌으면 잠시 뒤 true — 원형 게이지가 0에서 차오르게 */
const useFilled = (animate: boolean) => {
  const [filled, setFilled] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    // 첫 페인트(빈 원)가 화면에 나간 뒤에 채워야 transition 이 걸린다 — 한 프레임으로는 페인트 전에 바뀔 수 있다
    const timer = setTimeout(() => setFilled(true), 60);
    return () => clearTimeout(timer);
  }, [animate]);
  return filled;
};

type ScoreTone = 'best' | 'good' | 'okay';

/** 점수 구간 색 — 90점 이상 브랜드 파랑, 80점대 민트, 그 아래(바닥 70점) 보라 */
const scoreTone = (value: number): ScoreTone =>
  value >= 90 ? 'best' : value >= 80 ? 'good' : 'okay';

type GaugeProps = {
  value: number;
  size: number;
  stroke: number;
  tone: ScoreTone;
  animate: boolean;
  delayMs?: number;
  children: ReactNode;
};

/** 원형 게이지(라이트하우스형) — 0~100 을 원 둘레로 */
const Gauge = ({
  value,
  size,
  stroke,
  tone,
  animate,
  delayMs = 0,
  children,
}: GaugeProps) => {
  const filled = useFilled(animate);
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const offset = filled ? length * (1 - value / 100) : length;
  return (
    <div className={styles.gauge} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          className={styles.gaugeTrack}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          strokeWidth={stroke}
        />
        <circle
          className={styles.gaugeArc}
          data-tone={tone}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          strokeWidth={stroke}
          strokeDasharray={length}
          strokeDashoffset={offset}
          style={{ transitionDelay: `${delayMs}ms` }}
        />
      </svg>
      <div className={styles.gaugeValue}>{children}</div>
    </div>
  );
};

/** 총점(큰 원) + 한마디 + 세 운(작은 원) — HJ 11/24 시안 R1, 원 색은 점수 구간(G3) */
/**
 * 총점(큰 원, 원 안에 "총점") + 한 줄 평은 큰 원 아래 왼쪽 칸 · 세 운(작은 원)은 오른쪽 세로 — HJ 11/24
 * 원 색은 점수 구간(90↑ 파랑 · 80대 민트 · 70대 보라)
 */
const ScoreBlock = ({
  score,
  animate,
  rise,
}: {
  score: DailyScore;
  animate: boolean;
  rise: Rise;
}) => {
  const total = useCountUp(score.total, animate, 1000);
  return (
    <div className='flex items-center justify-center gap-9'>
      <div className='grid w-[148px] justify-items-center gap-3 text-center'>
        <Gauge
          value={score.total}
          size={124}
          stroke={10}
          tone={scoreTone(score.total)}
          animate={animate}
        >
          <span className='mb-1 text-xs text-text-subtle'>총점</span>
          <p
            className='text-[38px] font-bold leading-none text-text-strong tabular-nums'
            aria-label={`총점 ${score.total}점`}
          >
            {total}
          </p>
        </Gauge>
        <p
          {...rise(2)}
          className={`${rise(2).className ?? ''} break-keep text-[13px] leading-snug text-text-subtle`}
        >
          {score.comment}
        </p>
      </div>
      <dl
        {...rise(1)}
        className={`${rise(1).className ?? ''} grid gap-3.5 text-left`}
      >
        {score.items.map((item, i) => (
          <div key={item.key} className='flex items-center gap-3'>
            <dd>
              <Gauge
                value={item.value}
                size={46}
                stroke={4}
                tone={scoreTone(item.value)}
                animate={animate}
                delayMs={RISE_STEP_MS + i * 150}
              >
                <span className='text-sm font-bold text-text-strong tabular-nums'>
                  {item.value}
                </span>
              </Gauge>
            </dd>
            <dt className='text-[13px] text-text-subtle'>{item.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
};

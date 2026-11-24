'use client';

import { useState, useTransition } from 'react';

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

import type { DailyScore, DailySentence } from '@/entities/daily-sentence';

import styles from './DailySentenceBook.module.css';

/** 책장이 넘어가는 연출 길이 — 서재 카드(DailySentenceCard)와 같다 */
const OPENING_MS = 2200;
const TURNING_PAGES = 4;

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
      const [outcome] = await Promise.all([
        memberId ? drawDailySentenceAction() : drawAsGuest(),
        wait(prefersReducedMotion() ? 0 : OPENING_MS),
      ]);
      setOpening(false);
      if (!outcome.ok) {
        toast.error(outcome.message);
        return;
      }
      setDrawn({ sentence: outcome.sentence, bookHref: outcome.bookHref });
      trackEvent('daily_sentence_draw', { member: Boolean(memberId), place });
      // 뒤 화면(서재 배너·캘린더 책갈피)을 다시 그린다 — 모달이 떠 있어도 그대로 유지된다
      if (memberId) router.refresh();
    });
  };

  const dateLabel = `${Number(todayKey.slice(5, 7))}월 ${Number(todayKey.slice(8, 10))}일`;

  if (state === 'open' && result) {
    return (
      <section
        aria-labelledby='sentence-draw-heading'
        className={`grid gap-5 ${styles.reveal}`}
        aria-live='polite'
      >
        <div className='text-center'>
          <p className='text-xs font-medium text-text-subtle'>
            {dateLabel} · 오늘의 독서운
          </p>
          {score && <ScoreBlock score={score} />}
        </div>

        <figure className='grid grid-cols-[auto_1fr] items-start gap-4 rounded-2xl bg-sunken p-5'>
          <BookCover
            src={result.sentence.cover_image}
            title={result.sentence.book_title}
            author={result.sentence.author}
            size='md'
            small
            decorative
          />
          <div className='min-w-0'>
            <blockquote
              id='sentence-draw-heading'
              className='whitespace-pre-wrap break-keep text-base font-semibold leading-relaxed text-text-strong'
            >
              {result.sentence.text}
            </blockquote>
            <figcaption className='mt-3 text-sm text-text-subtle'>
              {formatSentenceSource(result.sentence)}
            </figcaption>
            {result.bookHref && (
              <Link
                href={result.bookHref}
                className='mt-2 inline-flex items-center gap-0.5 text-sm font-medium text-text-strong underline-offset-4 hover:underline'
              >
                이 책 보러 가기
                <ChevronRight className='size-4' aria-hidden />
              </Link>
            )}
          </div>
        </figure>

        <div className='grid gap-2'>
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
        className={`${styles.stage} ${styles.large}`}
        data-state={state}
        aria-hidden
      >
        <div className={styles.cover}>
          <span className={styles.coverTitle}>
            오늘의
            <br />
            문장
          </span>
          <span className={styles.ribbon} />
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

/** 총점 + 세부 셋(가장 높은 항목만 민트) */
const ScoreBlock = ({ score }: { score: DailyScore }) => {
  const top = Math.max(...score.items.map((item) => item.value));
  return (
    <div className='mx-auto mt-2 grid max-w-xs gap-3'>
      <p className='flex items-baseline justify-center gap-2'>
        <span className='text-5xl font-bold leading-none text-text-strong tabular-nums'>
          {score.total}
        </span>
        <span className='text-left text-sm text-text-subtle'>
          점<br />
          {score.comment}
        </span>
      </p>
      <dl className='grid gap-2'>
        {score.items.map((item) => (
          <div
            key={item.key}
            className='grid grid-cols-[3.25rem_1fr_1.75rem] items-center gap-2.5 text-sm'
          >
            <dt className='text-left text-text-subtle'>{item.label}</dt>
            <dd className={styles.bar} data-top={item.value === top}>
              <span style={{ width: `${item.value}%` }} />
            </dd>
            <dd className='text-right font-medium text-text-strong tabular-nums'>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

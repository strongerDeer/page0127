'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { BookCover, Button } from '@repo/ui';
import { BookOpen, ChevronRight, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { formatSentenceSource } from '@/entities/daily-sentence';

import { drawDailySentenceAction } from '../api/drawDailySentenceAction';

import type { DailySentence } from '@/entities/daily-sentence';

import styles from './DailySentenceBook.module.css';

/** 책장이 넘어가는 연출 길이 — 서버 응답이 더 빨라도 이만큼은 보여 준다 */
const OPENING_MS = 2200;
const TURNING_PAGES = 4;

type DailySentenceCardProps = {
  /** 오늘 이미 펼친 문장 — 없으면 닫힌 책과 펼치기 버튼 */
  today: DailySentence | null;
  /** 오늘 문장의 "이 책 보러 가기" 주소(서버가 정한다) — 없으면 링크를 그리지 않는다 */
  todayBookHref?: string | null;
};

type BookState = 'closed' | 'opening' | 'open';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 서재 상단 "오늘의 문장" 카드 (Client Component) — 주인에게만.
 *
 * 펼치는 순간 기록된다(저장 버튼 없음, HJ 2026-11-09). 연출(약 2초)과 서버 요청을
 * Promise.all 로 함께 기다린다 — 응답이 빨라도 책장은 끝까지 넘어가고, 느려도 연출이
 * 끝난 뒤 바로 문장이 나온다. 모션 줄이기 설정이면 연출을 건너뛴다.
 *
 * 펼친 뒤 router.refresh() 로 서버 컴포넌트를 다시 그려 캘린더 북마크까지 맞춘다.
 */
export const DailySentenceCard = ({
  today,
  todayBookHref = null,
}: DailySentenceCardProps) => {
  const router = useRouter();
  const [sentence, setSentence] = useState(today);
  const [bookHref, setBookHref] = useState(todayBookHref);
  const [state, setState] = useState<BookState>(today ? 'open' : 'closed');
  const [, startTransition] = useTransition();

  const handleOpen = () => {
    setState('opening');
    startTransition(async () => {
      const [result] = await Promise.all([
        drawDailySentenceAction(),
        wait(prefersReducedMotion() ? 0 : OPENING_MS),
      ]);
      if (!result.ok) {
        toast.error(result.message);
        setState('closed');
        return;
      }
      setSentence(result.sentence);
      setBookHref(result.bookHref);
      setState('open');
      router.refresh();
    });
  };

  return (
    // 독서 캘린더의 오늘 패널 안에 들어간다(HJ B안, 2026-11-10) — 테두리·큰 제목은 패널이 맡는다
    <section aria-labelledby='daily-sentence-heading'>
      <div className='flex items-baseline justify-between gap-3'>
        <h4
          id='daily-sentence-heading'
          className='text-xs font-medium text-text-subtle'
        >
          {sentence ? '오늘 펼쳐진 문장' : '오늘의 문장'}
        </h4>
        <span className='inline-flex items-center gap-1 text-xs text-text-subtle'>
          <Lock className='size-3' aria-hidden />
          나만 보여요
        </span>
      </div>

      <div className='mt-3 flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-start'>
        {state === 'open' && sentence ? (
          // 펼친 뒤에는 빈 책장 그림 대신 그 책의 표지 — 표지가 없으면 BookCover 가 제목을 조판한다
          <SentenceBookCover sentence={sentence} href={bookHref} />
        ) : (
          <div className={styles.stage} data-state={state} aria-hidden>
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
        )}

        {state === 'open' && sentence ? (
          // 문장이 바뀌는 순간 스크린 리더에도 읽어 준다
          <div className={`min-w-0 ${styles.reveal}`} aria-live='polite'>
            <blockquote className='whitespace-pre-wrap break-keep text-base font-bold leading-relaxed text-text-strong'>
              {sentence.text}
            </blockquote>
            <p className='mt-3 text-sm text-text-subtle'>
              {formatSentenceSource(sentence)}
            </p>
            {bookHref && (
              <Link
                href={bookHref}
                className='mt-2 inline-flex items-center gap-0.5 text-sm font-medium text-text-strong underline-offset-4 hover:underline'
              >
                이 책 보러 가기
                <ChevronRight className='size-4' aria-hidden />
              </Link>
            )}
          </div>
        ) : (
          <div className='min-w-0'>
            <p className='break-keep text-base font-bold text-text-strong'>
              하루에 한 번, 나를 위한 한 페이지.
            </p>
            <p className='mt-1 break-keep text-sm text-text-subtle'>
              펼친 문장은 독서 캘린더에 책갈피로 남아요.
            </p>
            <Button
              className='mt-4'
              onClick={handleOpen}
              disabled={state === 'opening'}
            >
              <BookOpen aria-hidden />
              {state === 'opening' ? '펼치는 중…' : '오늘의 문장 펼치기'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

type SentenceBookCoverProps = {
  sentence: DailySentence;
  href: string | null;
};

/** 펼친 카드 왼쪽 표지 — 링크가 있으면 눌러서 책으로 간다(같은 곳을 가리키는 글 링크가 옆에 있어 탭 순서에서는 뺀다) */
const SentenceBookCover = ({ sentence, href }: SentenceBookCoverProps) => {
  const cover = (
    <BookCover
      src={sentence.cover_image}
      title={sentence.book_title}
      author={sentence.author}
      size='md'
      small
      decorative
    />
  );

  return (
    <div className={`flex shrink-0 ${styles.reveal}`}>
      {href ? (
        <Link href={href} tabIndex={-1} aria-hidden>
          {cover}
        </Link>
      ) : (
        cover
      )}
    </div>
  );
};

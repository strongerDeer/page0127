import Link from 'next/link';

import { BookCover, Button } from '@repo/ui';
import { BookOpen, ChevronRight, Lock } from 'lucide-react';

import { formatSentenceSource } from '@/entities/daily-sentence';

import type { DailySentence } from '@/entities/daily-sentence';

import styles from './DailySentenceBook.module.css';

type DailySentenceCardProps = {
  /** 오늘 이미 펼친 문장 — 없으면 닫힌 책과 펼치기 버튼 */
  today: DailySentence | null;
  /** 오늘 문장의 "이 책 보러 가기" 주소(서버가 정한다) — 없으면 링크를 그리지 않는다 */
  todayBookHref?: string | null;
};

/**
 * 독서 캘린더 오늘 칸의 "오늘의 문장" 카드 — 주인에게만.
 *
 * 펼치기 버튼은 /sentence 링크라 @modal/(.)sentence 가 가로채 당근 책 모달을 띄운다.
 * 서재 배너·홈 당근과 같은 SentenceBook 연출로 맞췄다(HJ A안, 2026-11-26 — 예전엔 이 카드 안에서 바로 뽑았다).
 * 모달에서 뽑으면 router.refresh() 로 서버가 다시 그려 today 가 채워지고, 카드는 오늘 문장을 보여 준다.
 */
export const DailySentenceCard = ({
  today: sentence,
  todayBookHref: bookHref = null,
}: DailySentenceCardProps) => {
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
        {sentence ? (
          // 펼친 뒤에는 빈 책장 그림 대신 그 책의 표지 — 표지가 없으면 BookCover 가 제목을 조판한다
          <SentenceBookCover sentence={sentence} href={bookHref} />
        ) : (
          <div className={styles.stage} aria-hidden>
            <div className={styles.cover}>
              <span className={styles.coverTitle}>
                오늘의
                <br />
                문장
              </span>
              <span className={styles.ribbon} />
            </div>
          </div>
        )}

        {sentence ? (
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
            <Button asChild className='mt-4'>
              <Link href='/sentence' scroll={false}>
                <BookOpen aria-hidden />
                오늘의 문장 펼치기
              </Link>
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

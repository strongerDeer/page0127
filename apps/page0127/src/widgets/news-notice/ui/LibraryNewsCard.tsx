'use client';

import { ChevronRight, X } from 'lucide-react';

import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { useUnseenNews } from '../model/NewsContext';

import type { NewsStamp } from '../model/newsStamps';

const KIND_LABEL: Record<NewsStamp['kind'], string> = {
  update: '공지',
  story: '책 이야기',
};

/** "11월 25일" (한국 날짜) */
const formatMonthDay = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));

/**
 * 내 서재 새 소식 카드 — 안 본 소식 중 가장 최근 한 장(2026-11-27 HJ C안 ①자동).
 *
 * 회원은 로그인하면 홈 대신 서재로 오므로, 홈 띠지(방문자 창구)를 못 본다.
 * 그래서 회원 창구를 서재 안에 둔다. 글은 따로 쓰지 않는다 — 공지 기록(CHANGELOG)과
 * 책 이야기 글을 그대로 쓰므로 소식을 한 곳에만 적으면 점·카드·/updates 가 같이 바뀐다.
 *
 * - 주인에게만: 페이지가 isOwnProfile 일 때만 넣는다.
 * - ✕ 를 누르면 그 소식은 본 것으로 남아 다시 안 뜬다(다음 소식이 있으면 그게 뜬다).
 * - 바로 가기를 누르면 도착한 페이지가 본 것으로 남긴다(NewsSeenTracker).
 * - 큰 민트 면은 쓰지 않는다(브랜드 규칙) — 파란 기운이 아주 옅은 면.
 */
export const LibraryNewsCard = () => {
  const { all, markSeen } = useUnseenNews();
  const latest = all[0];
  if (!latest) return null;

  const cta = latest.kind === 'story' ? '글 읽기' : '바로 가기';

  return (
    <aside
      aria-label='새 소식'
      className='relative rounded-2xl border border-line bg-primary/5 py-4 pl-5 pr-12'
    >
      <p className='flex items-center gap-1.5 text-xs text-text-subtle'>
        <span
          aria-hidden='true'
          className='size-1.5 rounded-full bg-destructive'
        />
        새 소식 · {KIND_LABEL[latest.kind]} ·{' '}
        {formatMonthDay(latest.publishedAt)}
      </p>
      <p className='mt-1 break-keep text-base font-bold text-text-strong'>
        {latest.title}
      </p>
      {latest.description && (
        <p className='mt-0.5 line-clamp-2 break-keep text-sm text-text-subtle'>
          {latest.description}
        </p>
      )}
      <IntentPrefetchLink
        href={latest.href}
        className='mt-2 inline-flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline hover:underline-offset-4'
      >
        {cta}
        <ChevronRight aria-hidden='true' className='size-4' />
      </IntentPrefetchLink>
      <button
        type='button'
        aria-label='이 소식 닫기'
        onClick={() => markSeen([latest.id])}
        className='absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-sunken hover:text-text-strong'
      >
        <X aria-hidden='true' className='size-4' />
      </button>
    </aside>
  );
};

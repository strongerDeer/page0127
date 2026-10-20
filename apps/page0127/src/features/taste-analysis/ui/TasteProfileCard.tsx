import Link from 'next/link';

import { TASTE_ANALYSIS_BOOK_LABEL } from '@/entities/taste-analysis/model/analysisGate';
import { groupTasteHistory } from '@/entities/taste-analysis/model/groupTasteHistory';
import { getPersonalityColor } from '@/entities/taste-analysis/model/personalityTypes';

import type { PublicTasteHistoryItem } from '@/entities/taste-analysis/types';

type TasteProfileCardProps = {
  /** 최신순 (get_public_taste_history) */
  history: PublicTasteHistoryItem[];
  isOwner: boolean;
  /** 주인 전용 분석 버튼 — 게이트·다이얼로그는 헤더가 갖고 있다 */
  action?: React.ReactNode;
  analyzableBookCount: number;
  minBooks: number;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    timeZone: 'Asia/Seoul',
  });

const detailHref = (id: string) => `/dashboard/taste-analysis/${id}`;

const BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-line-soft bg-sunken px-2 py-0.5 text-text-body';

/**
 * ① 헤더 오른쪽 취향 카드.
 * 최신 결과 하나를 크게, 지난 결과는 "변해 온 길"로 — 같은 성향이 연달아 나오면 한 뱃지 + ×N.
 */
export const TasteProfileCard = ({
  history,
  isOwner,
  action,
  analyzableBookCount,
  minBooks,
}: TasteProfileCardProps) => {
  const latest = history[0];

  if (!latest) {
    if (!isOwner) return null;
    const left = Math.max(minBooks - analyzableBookCount, 0);
    return (
      <div className='rounded-2xl border border-dashed border-line-soft bg-card p-5'>
        <p className='text-xs text-text-subtle'>AI 독서 성향</p>
        <p className='mt-1 text-sm text-text-body'>
          {TASTE_ANALYSIS_BOOK_LABEL} {analyzableBookCount}/{minBooks}권
          {left > 0 && ` — ${left}권 더 모이면 AI가 성향을 알려줘요`}
        </p>
        {action && <div className='mt-3'>{action}</div>}
      </div>
    );
  }

  const runs = groupTasteHistory(history);
  const topics = (latest.liked_topics ?? []).slice(0, 4);

  return (
    <div className='relative overflow-hidden rounded-2xl bg-card p-5 pl-6'>
      {/* 카드 면은 흰 배경 유지, 성향 색은 왼쪽 얇은 바에만 */}
      <span
        aria-hidden
        className='absolute inset-y-0 left-0 w-1.5'
        style={{
          backgroundColor: getPersonalityColor(latest.personality_type),
        }}
      />
      <div className='flex items-start justify-between gap-2'>
        <p className='text-xs text-text-subtle'>
          AI 독서 성향 · {formatDate(latest.created_at)}
          {/* 방문자에게는 권수가 null — 비공개 책 수가 드러나지 않게 RPC 가 감춘다 */}
          {latest.analyzed_books_count !== null &&
            ` · 책 ${latest.analyzed_books_count}권 기준`}
        </p>
        {isOwner && (
          <Link
            href={detailHref(latest.id)}
            className='shrink-0 text-xs text-primary hover:underline'
          >
            자세히 ›
          </Link>
        )}
      </div>
      <p className='heading-2 mt-1 break-keep'>{latest.personality_type}</p>

      {topics.length > 0 && (
        <ul className='mt-2 flex flex-wrap gap-1'>
          {topics.map((topic) => (
            <li
              key={topic}
              className='rounded-full bg-accent px-2 py-0.5 text-xs text-text-body'
            >
              #{topic}
            </li>
          ))}
        </ul>
      )}

      {runs.length > 1 && (
        <div className='mt-3 flex flex-wrap items-center gap-1 border-t border-line-soft pt-3 text-xs text-text-subtle'>
          <span className='mr-1'>취향의 변화</span>
          {runs.map((run, index) => {
            const badge = (
              <>
                <span
                  aria-hidden
                  className='size-1.5 rounded-full'
                  style={{
                    backgroundColor: getPersonalityColor(run.personalityType),
                  }}
                />
                {run.personalityType}
                {run.count > 1 && ` ×${run.count}`}
                <span className='text-text-subtle'>
                  {formatMonth(run.startedAt)}
                </span>
              </>
            );
            return (
              <span
                key={run.latestId}
                className='inline-flex items-center gap-1'
              >
                {index > 0 && <span aria-hidden>→</span>}
                {isOwner ? (
                  <Link
                    href={detailHref(run.latestId)}
                    className={`${BADGE_CLASS} hover:border-line-strong`}
                  >
                    {badge}
                  </Link>
                ) : (
                  <span className={BADGE_CLASS}>{badge}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {action && <div className='mt-3'>{action}</div>}
    </div>
  );
};

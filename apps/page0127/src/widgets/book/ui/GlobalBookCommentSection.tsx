'use client';

import { CommentThread, useCommentCount } from '@/features/comment';

import type { CommentTarget } from '@/entities/comment';

type GlobalBookCommentSectionProps = {
  globalBookId: string;
};

/**
 * 전역 책 스레드 — "이 책에 남긴 말"
 *
 * 학습 포인트:
 * - 개인 책 스트림과 달리 활동 마커가 없다. 전역 책은 여러 사람이 담는 "책 그 자체"라
 *   특정 사용자의 상태 변화(담음·완독)가 존재하지 않는다.
 * - 대상만 globalBook으로 넘기면 commentApi가 알아서 전역 엔드포인트로 간다.
 * - 이름: 메뉴의 "책 이야기"(블로그)와 겹치지 않게 "이 책에 남긴 말"(HJ, 2026-11-27).
 */
export const GlobalBookCommentSection = ({
  globalBookId,
}: GlobalBookCommentSectionProps) => {
  const target: CommentTarget = { type: 'globalBook', id: globalBookId };
  const totalCount = useCommentCount(target, 0);

  return (
    <section className='flex flex-col gap-4 border-t border-line pt-6'>
      <h2 className='heading-2'>
        이 책에 남긴 말
        {totalCount > 0 && (
          <span className='ml-2 text-text-subtle tabular-nums'>{totalCount}</span>
        )}
      </h2>
      <CommentThread
        target={target}
        placeholder='이 책에 대해 남기기…'
        emptyText='아직 이 책에 남긴 말이 없어요.'
      />
    </section>
  );
};

import { compareIsoTime } from './bookComments';

import type { CommentNode } from './bookComments';

/**
 * 책 스트림 — 활동(상태 변화)과 댓글을 한 줄기로 병합한다
 *
 * 학습 포인트:
 * - 상태 변화는 따로 저장하지 않는다. activities에 이미 있는 것을 읽어 섞을 뿐이다.
 * - kind로 구분하는 구별 유니온(discriminated union) — 렌더 쪽에서 switch로 좁힌다.
 */

export type StreamActivity = {
  kind: 'activity';
  id: string;
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content: string | null;
  createdAt: string;
};

export type StreamComment = CommentNode & { kind: 'comment' };

export type StreamItem = StreamActivity | StreamComment;

export function mergeStreamItems(
  activities: StreamActivity[],
  comments: CommentNode[]
): StreamItem[] {
  const commentItems: StreamComment[] = comments.map((c) => ({
    ...c,
    kind: 'comment',
  }));

  // 최신이 위(내림차순). 스트림 맨 아래에 입력창이 있으므로, 방금 달린 댓글을 보려고
  // 긴 목록을 스크롤할 필요가 없다.
  return [...activities, ...commentItems].sort((a, b) => {
    const diff = compareIsoTime(b.createdAt, a.createdAt);
    if (diff !== 0) return diff;
    // 같은 시각이면 활동을 아래에 — 위(최신)에서 아래(과거)로 읽으므로,
    // "완독했어요"가 그에 달린 댓글보다 아래에 오는 게 자연스럽다
    if (a.kind === b.kind) return 0;
    return a.kind === 'activity' ? 1 : -1;
  });
}

/**
 * Activity 엔티티 타입 정의
 */

export type FeedFilter = {
  type?: 'all' | 'following';
  limit?: number;
  offset?: number;
}

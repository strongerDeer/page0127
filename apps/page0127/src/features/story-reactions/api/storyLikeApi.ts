import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

/** 좋아요 상태 — 비회원은 isLiked 가 항상 false */
export type StoryLikeState = { count: number; isLiked: boolean };

export const storyLikeKeys = {
  all: ['story-likes'] as const,
  byStory: (storyId: string) => [...storyLikeKeys.all, storyId] as const,
};

/** 책 이야기 좋아요 API — 응답은 언제나 "지금 상태"라 그대로 캐시에 넣는다 */
export const storyLikeApi = {
  get: async (storyId: string) =>
    (await apiClient.get<StoryLikeState>(API_ENDPOINTS.stories.likes(storyId)))
      .data,
  like: async (storyId: string) =>
    (await apiClient.post<StoryLikeState>(API_ENDPOINTS.stories.likes(storyId)))
      .data,
  unlike: async (storyId: string) =>
    (
      await apiClient.delete<StoryLikeState>(
        API_ENDPOINTS.stories.likes(storyId)
      )
    ).data,
};

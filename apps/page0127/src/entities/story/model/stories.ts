import type { StoryMeta } from './types';
import type { MDXContent } from 'mdx/types';

import { daeonsil } from '@/content/stories/daeonsil/meta';

/**
 * 책 이야기 목록 — 새 이야기는 여기에 한 줄 추가한다(최신이 위).
 *
 * 왜 DB 가 아니라 코드인가(2026-11-23 HJ 결정 B):
 * 글을 쓰는 사람이 HJ 한 명이고 한 달에 몇 편이라, 어드민·테이블·편집기를 만드는 비용이
 * 더 크다. 코드에 두면 빌드 때 페이지를 미리 만들어(SSG) 방문마다 서버 함수가 돌지 않는다.
 *
 * loadBody 는 함수로 감싼다 — 책 정보 페이지처럼 "이야기가 있나?"만 묻는 곳이
 * 글(MDX)까지 불러오지 않게.
 */
type StoryEntry = StoryMeta & {
  loadBody: () => Promise<{ default: MDXContent }>;
};

export const STORIES: readonly StoryEntry[] = [
  {
    ...daeonsil,
    loadBody: () => import('@/content/stories/daeonsil/index.mdx'),
  },
];

export const getStoryBySlug = (slug: string) =>
  STORIES.find((story) => story.slug === slug) ?? null;

/** 책 정보 페이지에서 "이 책의 이야기" 카드를 띄울지 판단한다 */
export const getStoryByBookId = (bookId: string) =>
  STORIES.find((story) => story.bookId === bookId) ?? null;

export const storyPath = (slug: string) => `/blog/${slug}`;

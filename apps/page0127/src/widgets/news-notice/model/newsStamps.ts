/**
 * 새 소식 표시(빨간 점·서재 소식 카드)가 쓰는 "소식 한 건" — 순수 함수만 둔다.
 *
 * 소식은 두 곳에서 온다(2026-11-27 HJ A+C안, 책 이야기 포함).
 * - 공지·업데이트: siteInfo.ts 의 CHANGELOG(코드, 배포해야 바뀐다)
 * - 책 이야기: stories 테이블의 공개 글(어드민에서 저장하면 바로 바뀐다)
 *
 * "봤다"는 기록은 서버에 두지 않고 브라우저(localStorage)에 소식 id 목록으로 둔다.
 * 시각(마지막으로 본 때) 대신 id 를 쓰는 이유: CHANGELOG 는 날짜만 있고 시각이 없어서,
 * 오후에 /updates 를 본 뒤 같은 날짜로 배포된 새 기록이 "이미 본 것"으로 묻힌다.
 */
import type { StorySummary } from '@/entities/story';
import type { ChangelogEntry } from '@/widgets/landing/model/siteInfo';

export type NewsKind = 'update' | 'story';

export type NewsStamp = {
  /** localStorage 에 남기는 열쇠 — 같은 소식은 배포가 바뀌어도 같은 id */
  id: string;
  kind: NewsKind;
  title: string;
  /** 카드 둘째 줄. 없으면 그리지 않는다 */
  description: string | null;
  /** 카드 "바로 가기" 주소 */
  href: string;
  /** ISO 시각 — 최근 순서·"최근 N일" 판정에 쓴다 */
  publishedAt: string;
};

/** 이보다 오래된 소식은 처음 온 기기에서도 새 소식으로 치지 않는다(점이 잔뜩 뜨지 않게) */
export const NEWS_WINDOW_DAYS = 14;

/** 종류마다 이만큼만 내려보낸다 — 14일 안의 소식이 이보다 많을 일은 없다 */
const PER_KIND_LIMIT = 6;

/** '2026.11.26' → 그날 0시(한국 시간) ISO */
export const changelogDateToIso = (date: string): string =>
  `${date.replaceAll('.', '-')}T00:00:00+09:00`;

export const changelogToStamps = (entries: ChangelogEntry[]): NewsStamp[] =>
  entries.slice(0, PER_KIND_LIMIT).map((entry) => ({
    id: `update:${entry.date}:${entry.title}`,
    kind: 'update',
    title: entry.title,
    description: entry.description ?? null,
    href: entry.href ?? '/updates',
    publishedAt: changelogDateToIso(entry.date),
  }));

export const storiesToStamps = (stories: StorySummary[]): NewsStamp[] =>
  stories.slice(0, PER_KIND_LIMIT).map((story) => ({
    id: `story:${story.id}`,
    kind: 'story',
    title: story.title,
    description: story.description || null,
    href: `/blog/${story.slug}`,
    publishedAt: story.publishedAt,
  }));

/** 최신순으로 합친다 */
export const mergeStamps = (...groups: NewsStamp[][]): NewsStamp[] =>
  groups
    .flat()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

/** 아직 안 본 최근 소식(최신순). now 는 밀리초 */
export const pickUnseen = (
  stamps: NewsStamp[],
  seenIds: readonly string[],
  now: number
): NewsStamp[] => {
  const since = now - NEWS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set(seenIds);
  return stamps.filter(
    (stamp) => !seen.has(stamp.id) && Date.parse(stamp.publishedAt) >= since
  );
};

/**
 * 지금 페이지를 열면 "봤다"로 칠 소식 id.
 * - /updates → 공지 전부, /blog → 책 이야기 전부, /blog/{slug} → 그 글
 * - 소식 카드의 바로 가기 주소(예: 필사 페이지)에 들어가도 그 소식은 본 것으로 친다
 */
export const idsSeenOnPath = (
  pathname: string,
  stamps: NewsStamp[]
): string[] =>
  stamps
    .filter((stamp) => {
      if (pathname === '/updates' && stamp.kind === 'update') return true;
      if (pathname === '/blog' && stamp.kind === 'story') return true;
      return pathname === stamp.href;
    })
    .map((stamp) => stamp.id);

/** 저장 목록이 한없이 늘지 않게 — 최근 것만 남긴다 */
export const SEEN_IDS_LIMIT = 60;

export const addSeenIds = (
  prev: readonly string[],
  ids: string[]
): string[] => {
  const fresh = ids.filter((id) => !prev.includes(id));
  if (fresh.length === 0) return prev as string[];
  return [...prev, ...fresh].slice(-SEEN_IDS_LIMIT);
};

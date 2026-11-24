import type {
  Story,
  StoryCharacterGroup,
  StoryImage,
  StoryLeadStat,
  StorySummary,
} from './types';

/**
 * stories 행 → 화면용 타입.
 *
 * JSONB 칸(map_image·map_cards·characters)은 DB 가 모양을 검사하지 않는다.
 * 저장하는 어드민 코드가 검사하지만, 손으로 고친 행 하나 때문에 공개 페이지가 깨지면 안 되므로
 * 읽을 때도 모양이 틀린 항목은 조용히 버린다.
 */
export type StoryRow = {
  id: string;
  slug: string;
  /** 책 없는 글(독서 이야기)은 null — 20261124000600 */
  book_id: string | null;
  book_title: string | null;
  book_author: string | null;
  title: string;
  description: string | null;
  rating: number | null;
  map_image: unknown;
  lead_stat?: unknown;
  published_at: string | null;
  updated_at: string;
  created_at?: string;
  body?: string | null;
  map_cards?: unknown;
  characters?: unknown;
};

export const STORY_SUMMARY_COLUMNS =
  'id, slug, book_id, book_title, book_author, title, description, rating, map_image, lead_stat, published_at, updated_at';
export const STORY_COLUMNS = `${STORY_SUMMARY_COLUMNS}, body, map_cards, characters`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const toStoryImage = (value: unknown): StoryImage | null => {
  if (!isRecord(value)) return null;
  const { src, width, height, alt } = value;
  if (typeof src !== 'string' || !src) return null;
  if (typeof width !== 'number' || typeof height !== 'number') return null;
  if (width <= 0 || height <= 0) return null;
  return { src, width, height, alt: typeof alt === 'string' ? alt : '' };
};

export const toLeadStat = (value: unknown): StoryLeadStat | null => {
  if (!isRecord(value)) return null;
  const { value: number, unit, label, people } = value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return null;
  return {
    value: number,
    unit: typeof unit === 'string' ? unit : '',
    label: typeof label === 'string' ? label : '',
    people:
      typeof people === 'number' && people >= 0 && people <= 10 ? people : null,
  };
};

const toStoryImages = (value: unknown): StoryImage[] =>
  Array.isArray(value)
    ? value.map(toStoryImage).filter((image) => image !== null)
    : [];

export const toCharacterGroups = (value: unknown): StoryCharacterGroup[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((group) => {
    if (!isRecord(group) || typeof group.name !== 'string') return [];
    const people = Array.isArray(group.people)
      ? group.people.flatMap((person) =>
          isRecord(person) && typeof person.name === 'string' && person.name
            ? [
                {
                  name: person.name,
                  role: typeof person.role === 'string' ? person.role : '',
                },
              ]
            : []
        )
      : [];
    return people.length > 0 ? [{ name: group.name, people }] : [];
  });
};

export const toStorySummary = (row: StoryRow): StorySummary => ({
  id: row.id,
  slug: row.slug,
  bookId: row.book_id ?? null,
  bookTitle: row.book_id ? (row.book_title ?? '') : '',
  author: row.book_author ?? '',
  title: row.title,
  description: row.description ?? '',
  rating: row.rating ?? 0,
  mapImage: toStoryImage(row.map_image),
  leadStat: toLeadStat(row.lead_stat),
  publishedAt: row.published_at ?? row.created_at ?? row.updated_at,
  updatedAt: row.updated_at,
});

export const toStory = (row: StoryRow): Story => ({
  ...toStorySummary(row),
  body: row.body ?? '',
  mapCards: toStoryImages(row.map_cards),
  characters: toCharacterGroups(row.characters),
});

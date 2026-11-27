import {
  extractChartBlocks,
  findLeadStat,
  parseChartBlock,
} from '@/entities/story/model/chartBlock';

import type {
  StoryCharacterGroup,
  StoryImage,
  StoryLeadStat,
} from '@/entities/story';

/**
 * 어드민 책 이야기 폼 — 저장 전에 서버가 검사하는 순수 함수 모음(테스트 대상).
 *
 * DB 는 JSONB 칸의 모양을 검사하지 않으므로 여기서 지킨다. 화면도 같은 함수를 써서
 * 저장 전에 같은 메시지를 보여 준다.
 */

export const STORY_IMAGE_BUCKET = 'story-images';

/** 클라이언트 → 서버 액션으로 보내는 값 */
export type StoryInput = {
  /** 고칠 때만 */
  id?: string;
  /** 책을 새로 골랐을 때만 — 서버가 전체 도서(global_books)에 넣고 id 를 찾는다 */
  isbn?: string;
  /** 이미 연결된 책. isbn·bookId 둘 다 없으면 책 없는 글(독서 이야기) */
  bookId?: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  rating: number;
  mapImage: StoryImage | null;
  mapCards: StoryImage[];
  /** 대표 이미지 — 목록 썸네일·공유 미리보기 */
  coverImage: StoryImage | null;
  /** 목록 정사각형 썸네일에서 보일 곳 "가로% 세로%" */
  coverPosition: string;
  /** 책을 연결한 글이 독후감인가 — 책 없는 글은 저장할 때 true 로 둔다(뜻 없음) */
  isReview: boolean;
  /** 등장인물 — 사람이 쓰기 쉬운 글자 형식(parseCharactersText) */
  charactersText: string;
  isPublished: boolean;
};

export type ValidStory = {
  slug: string;
  title: string;
  description: string;
  body: string;
  rating: number;
  map_image: StoryImage | null;
  map_cards: StoryImage[];
  cover_image: StoryImage | null;
  cover_position: string;
  is_review: boolean;
  characters: StoryCharacterGroup[];
  /** 본문 첫 숫자 차트 — 목록·공유 이미지용(서버가 계산) */
  lead_stat: StoryLeadStat | null;
  is_published: boolean;
};

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** DB CHECK(stories.cover_position)와 같은 규칙 — 0~100 정수 % 두 개 */
const COVER_POSITION = /^(100|[1-9]?[0-9])% (100|[1-9]?[0-9])%$/;
export const SLUG_MAX = 80;
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 300;
/** 독후감 한 편으로 넉넉한 길이 — 실수로 큰 덩어리를 붙여 넣은 것만 막는다 */
export const BODY_MAX = 50_000;
const ALT_MAX = 300;
const MAX_CARDS = 10;

export const validateSlug = (slug: string): string | null => {
  if (!slug) return '주소(영문)를 적어 주세요.';
  if (slug.length > SLUG_MAX) return `주소는 ${SLUG_MAX}자 이하로 적어 주세요.`;
  if (!SLUG.test(slug))
    return '주소는 영문 소문자·숫자와 하이픈(-)만 쓸 수 있어요. 예: daeonsil-repair-report';
  return null;
};

/**
 * 그림 주소는 두 곳만 받는다 — 이 화면에서 올린 story-images 버킷, 리포의 public/images/stories.
 * 아무 외부 주소나 공개 페이지에 뜨지 않게 하고, 늘 미리 줄인 파일만 그리게 한다(변환 한도 X).
 */
export const isAllowedImageSrc = (
  src: string,
  supabaseUrl: string | undefined
): boolean => {
  if (/^\/images\/stories\/[a-z0-9/_-]+\.(webp|png|jpe?g)$/i.test(src))
    return true;
  if (!supabaseUrl) return false;
  return src.startsWith(
    `${supabaseUrl}/storage/v1/object/public/${STORY_IMAGE_BUCKET}/`
  );
};

const toSize = (value: unknown) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= 10_000
    ? value
    : null;

export const sanitizeImage = (
  image: StoryImage,
  supabaseUrl: string | undefined,
  fallbackAlt: string
): Result<StoryImage> => {
  const src = typeof image.src === 'string' ? image.src.trim() : '';
  if (!isAllowedImageSrc(src, supabaseUrl))
    return {
      ok: false,
      message: '그림은 이 화면에서 올린 파일만 쓸 수 있어요.',
    };
  const width = toSize(image.width);
  const height = toSize(image.height);
  if (!width || !height)
    return {
      ok: false,
      message: '그림 크기를 읽지 못했어요. 다시 올려 주세요.',
    };
  const alt =
    (typeof image.alt === 'string' ? image.alt.trim() : '') || fallbackAlt;
  return {
    ok: true,
    value: { src, width, height, alt: alt.slice(0, ALT_MAX) },
  };
};

/**
 * 등장인물 글자 형식 → 묶음 목록.
 *
 *   # 현재 · 2023
 *   강영두: 대온실 수리 보고서를 쓰는 사람
 *   은혜: 영두의 소꿉친구
 *
 * - `#` 로 시작하는 줄이 묶음 이름, 그 아래 줄이 "이름: 설명"(첫 콜론에서 나눈다)
 * - 묶음 이름 없이 시작하면 "등장인물" 묶음으로 모은다
 * - 설명 없이 이름만 써도 된다. 빈 줄은 무시. 사람이 없는 묶음은 버린다
 */
export const parseCharactersText = (text: string): StoryCharacterGroup[] => {
  const groups: StoryCharacterGroup[] = [];
  let current: StoryCharacterGroup | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      current = {
        name: line.replace(/^#+/, '').trim() || '등장인물',
        people: [],
      };
      groups.push(current);
      continue;
    }
    if (!current) {
      current = { name: '등장인물', people: [] };
      groups.push(current);
    }
    const match = /^([^:：]+)[:：](.*)$/.exec(line);
    const name = (match ? match[1] : line).trim();
    const role = (match ? match[2] : '').trim();
    if (name) current.people.push({ name, role });
  }

  return groups.filter((group) => group.people.length > 0);
};

/** 묶음 목록 → 등장인물 글자 형식 (편집 화면을 열 때) */
export const formatCharactersText = (groups: StoryCharacterGroup[]): string =>
  groups
    .map((group) =>
      [
        `# ${group.name}`,
        ...group.people.map((p) => (p.role ? `${p.name}: ${p.role}` : p.name)),
      ].join('\n')
    )
    .join('\n\n');

/** 본문 차트 블록이 모두 그려지는지 — 틀린 블록은 공개 페이지에서 조용히 빠지므로 저장 때 막는다 */
export const validateChartBlocks = (body: string): string | null => {
  for (const [index, block] of extractChartBlocks(body).entries()) {
    const result = parseChartBlock(block);
    if (!result.ok) return `본문 ${index + 1}번째 차트: ${result.error}`;
  }
  return null;
};

/**
 * 공개하려면 본문이나 관계도 중 하나는 있어야 한다 — 빈 글이 검색에 오르지 않게.
 * bookTitle 이 '' 이면 책 없는 글 — 별점은 0 으로 저장한다(DB CHECK 와 같은 규칙).
 */
export const validateStoryInput = (
  input: StoryInput,
  supabaseUrl: string | undefined,
  bookTitle: string
): Result<ValidStory> => {
  // 그림 대체 글: 책이 있으면 "책 제목 인물관계도", 없으면 글 제목
  const altBase = bookTitle ? `${bookTitle} 인물관계도` : input.title.trim();
  const slug = input.slug.trim();
  const slugError = validateSlug(slug);
  if (slugError) return { ok: false, message: slugError };

  const title = input.title.trim();
  if (!title) return { ok: false, message: '제목을 적어 주세요.' };
  if (title.length > TITLE_MAX)
    return { ok: false, message: `제목은 ${TITLE_MAX}자 이하로 적어 주세요.` };

  const description = input.description.trim();
  if (description.length > DESCRIPTION_MAX)
    return {
      ok: false,
      message: `소개는 ${DESCRIPTION_MAX}자 이하로 적어 주세요.`,
    };

  const body = input.body.replace(/\r\n/g, '\n').trim();
  if (body.length > BODY_MAX)
    return { ok: false, message: '본문이 너무 길어요.' };
  const chartError = validateChartBlocks(body);
  if (chartError) return { ok: false, message: chartError };

  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 0 || rating > 5)
    return { ok: false, message: '별점은 0~5 사이로 골라 주세요.' };

  let mapImage: StoryImage | null = null;
  if (input.mapImage) {
    const checked = sanitizeImage(input.mapImage, supabaseUrl, altBase);
    if (!checked.ok) return checked;
    mapImage = checked.value;
  }

  if (input.mapCards.length > MAX_CARDS)
    return { ok: false, message: `카드는 ${MAX_CARDS}장까지 올릴 수 있어요.` };
  const mapCards: StoryImage[] = [];
  for (const [index, card] of input.mapCards.entries()) {
    const checked = sanitizeImage(card, supabaseUrl, `${altBase} ${index + 1}`);
    if (!checked.ok) return checked;
    mapCards.push(checked.value);
  }
  if (mapCards.length > 0 && !mapImage)
    return {
      ok: false,
      message: '모바일 카드는 관계도 전체 그림이 있을 때만 쓸 수 있어요.',
    };

  let coverImage: StoryImage | null = null;
  if (input.coverImage) {
    const checked = sanitizeImage(input.coverImage, supabaseUrl, title);
    if (!checked.ok) return checked;
    coverImage = checked.value;
  }
  const coverPosition = input.coverPosition?.trim() || '50% 50%';
  if (!COVER_POSITION.test(coverPosition))
    return { ok: false, message: '대표 이미지 위치를 다시 골라 주세요.' };

  if (input.isPublished && !body && !mapImage)
    return {
      ok: false,
      message: '공개하려면 본문이나 관계도 그림이 하나는 있어야 해요.',
    };

  return {
    ok: true,
    value: {
      slug,
      title,
      description,
      body,
      rating: bookTitle ? rating : 0,
      map_image: mapImage,
      map_cards: mapCards,
      cover_image: coverImage,
      cover_position: coverPosition,
      // 책 없는 글은 종류를 고르지 않는다 — 기본값(true)으로 둬서 나중에 책을 붙이면 독후감부터
      is_review: bookTitle ? input.isReview !== false : true,
      characters: parseCharactersText(input.charactersText),
      lead_stat: findLeadStat(body),
      is_published: Boolean(input.isPublished),
    },
  };
};

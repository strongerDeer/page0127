import { describe, expect, it } from 'vitest';

import {
  formatCharactersText,
  isAllowedImageSrc,
  parseCharactersText,
  validateSlug,
  validateStoryInput,
} from './storyForm';

import type { StoryInput } from './storyForm';

const SUPABASE = 'https://abc.supabase.co';
const BUCKET_SRC = `${SUPABASE}/storage/v1/object/public/story-images/x.webp`;

const input = (over: Partial<StoryInput> = {}): StoryInput => ({
  slug: 'daeonsil-repair-report',
  title: '대온실 수리 보고서 독후감과 인물관계도',
  description: '',
  body: '첫 문단',
  rating: 0,
  mapImage: null,
  mapCards: [],
  coverImage: null,
  coverPosition: '50% 50%',
  isReview: true,
  charactersText: '',
  isPublished: false,
  ...over,
});

describe('validateSlug', () => {
  it('영문 소문자·숫자·하이픈만 받는다', () => {
    expect(validateSlug('daeonsil-repair-report')).toBeNull();
    expect(validateSlug('')).not.toBeNull();
    expect(validateSlug('대온실')).not.toBeNull();
    expect(validateSlug('Daeonsil')).not.toBeNull();
    expect(validateSlug('a--b')).not.toBeNull();
    expect(validateSlug('-a')).not.toBeNull();
  });
});

describe('isAllowedImageSrc', () => {
  it('우리 버킷과 public/images/stories 만 받는다', () => {
    expect(isAllowedImageSrc(BUCKET_SRC, SUPABASE)).toBe(true);
    expect(
      isAllowedImageSrc('/images/stories/daeonsil/character-map.webp', SUPABASE)
    ).toBe(true);
    expect(isAllowedImageSrc('https://evil.com/x.webp', SUPABASE)).toBe(false);
    expect(
      isAllowedImageSrc(
        `${SUPABASE}/storage/v1/object/public/banner-art/x.webp`,
        SUPABASE
      )
    ).toBe(false);
    expect(isAllowedImageSrc('/images/../secret.webp', SUPABASE)).toBe(false);
  });
});

describe('등장인물 글자 형식', () => {
  it('# 줄은 묶음, 아래 줄은 첫 콜론에서 이름·설명으로 나눈다', () => {
    const groups = parseCharactersText(
      '# 현재 · 2023\n강영두: 보고서: 쓰는 사람\n\n은혜\n# 빈 묶음\n'
    );
    expect(groups).toEqual([
      {
        name: '현재 · 2023',
        people: [
          { name: '강영두', role: '보고서: 쓰는 사람' },
          { name: '은혜', role: '' },
        ],
      },
    ]);
  });

  it('묶음 이름 없이 시작하면 "등장인물"로 모으고, 전각 콜론도 받는다', () => {
    expect(parseCharactersText('안나：학교 친구')).toEqual([
      { name: '등장인물', people: [{ name: '안나', role: '학교 친구' }] },
    ]);
  });

  it('format → parse 하면 그대로 돌아온다', () => {
    const groups = [
      {
        name: '낙원하숙 · 2003',
        people: [
          { name: '안문자', role: '하숙집 주인' },
          { name: '빽', role: '' },
        ],
      },
    ];
    expect(parseCharactersText(formatCharactersText(groups))).toEqual(groups);
  });
});

describe('validateStoryInput', () => {
  it('정상 값은 DB 행 모양으로 바꾼다', () => {
    const result = validateStoryInput(
      input({
        mapImage: { src: BUCKET_SRC, width: 1024, height: 1536, alt: '' },
        charactersText: '# 현재\n영두: 주인공',
        rating: 4,
      }),
      SUPABASE,
      '대온실 수리 보고서'
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // alt 를 비우면 "책 제목 인물관계도"로 채운다(이미지 검색용)
    expect(result.value.map_image?.alt).toBe('대온실 수리 보고서 인물관계도');
    expect(result.value.characters).toHaveLength(1);
    expect(result.value.rating).toBe(4);
  });

  it('외부 그림 주소·잘못된 별점·빈 공개 글은 막는다', () => {
    expect(
      validateStoryInput(
        input({
          mapImage: {
            src: 'https://evil.com/a.png',
            width: 1,
            height: 1,
            alt: '',
          },
        }),
        SUPABASE,
        '책'
      ).ok
    ).toBe(false);
    expect(validateStoryInput(input({ rating: 6 }), SUPABASE, '책').ok).toBe(
      false
    );
    expect(
      validateStoryInput(
        input({ body: '  ', isPublished: true }),
        SUPABASE,
        '책'
      ).ok
    ).toBe(false);
  });

  it('카드는 전체 그림이 있을 때만', () => {
    const card = { src: BUCKET_SRC, width: 1080, height: 1350, alt: '' };
    expect(
      validateStoryInput(input({ mapCards: [card] }), SUPABASE, '책').ok
    ).toBe(false);
  });

  it('책 없는 글: 별점은 0 으로, 그림 대체 글은 글 제목으로', () => {
    const result = validateStoryInput(
      input({
        title: '한국 독서 통계',
        rating: 5,
        mapImage: { src: BUCKET_SRC, width: 10, height: 10, alt: '' },
      }),
      SUPABASE,
      ''
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rating).toBe(0);
    expect(result.value.map_image?.alt).toBe('한국 독서 통계');
  });

  it('본문 차트: 틀린 블록은 저장을 막고, 첫 숫자는 lead_stat 으로', () => {
    const broken = validateStoryInput(
      input({ body: '```chart\ntype: number\nvalue: 38.5\n```' }),
      SUPABASE,
      ''
    );
    expect(broken).toEqual({
      ok: false,
      message: '본문 1번째 차트: source: 에 출처를 적어 주세요.',
    });

    const ok = validateStoryInput(
      input({
        body: '```chart\ntype: number\nvalue: 38.5\nunit: %\nlabel: 성인\nsource: 문체부\n```',
      }),
      SUPABASE,
      ''
    );
    expect(ok.ok && ok.value.lead_stat).toEqual({
      value: 38.5,
      unit: '%',
      label: '성인',
      people: null,
    });
  });
});

describe('대표 이미지·위치·글 종류', () => {
  const cover = { src: BUCKET_SRC, width: 1200, height: 630, alt: '' };

  it('대표 이미지는 우리 버킷만, 대체 글이 비면 글 제목', () => {
    const ok = validateStoryInput(input({ coverImage: cover }), SUPABASE, '책');
    expect(ok.ok && ok.value.cover_image).toEqual({
      ...cover,
      alt: '대온실 수리 보고서 독후감과 인물관계도',
    });
    const bad = validateStoryInput(
      input({ coverImage: { ...cover, src: 'https://evil.com/x.webp' } }),
      SUPABASE,
      '책'
    );
    expect(bad.ok).toBe(false);
  });

  it('위치는 "가로% 세로%" 정수만', () => {
    const ok = validateStoryInput(
      input({ coverPosition: '0% 100%' }),
      SUPABASE,
      '책'
    );
    expect(ok.ok && ok.value.cover_position).toBe('0% 100%');
    for (const coverPosition of ['101% 0%', 'left top', '50%', '1.5% 2%'])
      expect(
        validateStoryInput(input({ coverPosition }), SUPABASE, '책').ok
      ).toBe(false);
  });

  it('책 글은 독후감 여부를 그대로, 책 없는 글은 늘 true', () => {
    const essay = validateStoryInput(
      input({ isReview: false }),
      SUPABASE,
      '책'
    );
    expect(essay.ok && essay.value.is_review).toBe(false);
    const noBook = validateStoryInput(input({ isReview: false }), SUPABASE, '');
    expect(noBook.ok && noBook.value.is_review).toBe(true);
  });
});

describe('본문 그림', () => {
  it('우리 버킷 그림은 저장되고, 다른 주소 그림은 막는다', () => {
    const ok = validateStoryInput(
      input({ body: `글\n\n![장면](${BUCKET_SRC}#1200x630)` }),
      SUPABASE,
      '책'
    );
    expect(ok.ok).toBe(true);
    const bad = validateStoryInput(
      input({ body: '글\n\n![장면](https://evil.com/x.png)' }),
      SUPABASE,
      '책'
    );
    expect(bad).toEqual({
      ok: false,
      message: '본문 그림은 "그림 넣기" 버튼으로 올린 것만 쓸 수 있어요.',
    });
  });
});

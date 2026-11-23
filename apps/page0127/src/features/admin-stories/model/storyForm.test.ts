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
});

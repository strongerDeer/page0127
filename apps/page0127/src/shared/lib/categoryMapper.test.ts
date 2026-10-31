import { describe, expect, it } from 'vitest';

import { MAIN_CATEGORIES, mapToMainCategory } from './categoryMapper';

describe('mapToMainCategory', () => {
  it('인문학 분류를 소설로 보내지 않는다', () => {
    // 이 assertion 이 잠그는 버그: '인문학' 안에 '문학'이 들어 있어서
    // 소설 규칙(includes('문학'))에 먼저 걸렸다. 인문학은 늘 0권, 소설은 부풀었다.
    expect(mapToMainCategory('국내도서>인문학>철학')).toBe('인문학');
    expect(mapToMainCategory('국내도서>인문학>교양 인문학')).toBe('인문학');
    expect(mapToMainCategory('국내도서-인문')).toBe('인문학');
  });

  it('대분류 이름 그대로 저장된 값은 자기 자신으로 돌아온다', () => {
    // 운영 books.category 에는 '인문학'처럼 대분류 이름이 그대로 든 행이 있다.
    for (const category of MAIN_CATEGORIES) {
      expect(mapToMainCategory(category)).toBe(category);
    }
  });

  it('소설/시/희곡은 그대로 소설로 분류한다', () => {
    expect(mapToMainCategory('국내도서>소설/시/희곡>한국소설')).toBe(
      '소설/시/희곡'
    );
    // '과학소설'이 과학 규칙보다 소설 규칙에 먼저 걸려야 한다
    expect(
      mapToMainCategory('국내도서>소설/시/희곡>과학소설(SF)>외국 과학소설')
    ).toBe('소설/시/희곡');
    // 인문 규칙이 없는 '○○ 문학'은 여전히 소설이다
    expect(
      mapToMainCategory('국내도서>청소년>청소년 문학>청소년 에세이/시')
    ).toBe('소설/시/희곡');
  });

  it('인문학 아래의 문학이론은 인문학이다', () => {
    // 결정: 두 번째 칸(서점이 붙인 대분류)을 따른다. 문학이론은 작품이 아니라
    // 작품에 대한 비평·이론서라 독서 균형에서도 비문학 쪽에 세는 게 맞다.
    expect(mapToMainCategory('국내도서>인문학>문학이론')).toBe('인문학');
  });

  it('사회과학·정치·역사는 사회/역사로 묶는다', () => {
    // '과학' 규칙보다 먼저 걸려야 한다
    expect(mapToMainCategory('국내도서>사회과학>사회학>사회학 일반')).toBe(
      '사회/역사'
    );
    expect(mapToMainCategory('국내도서-사회 정치')).toBe('사회/역사');
    expect(mapToMainCategory('국내도서-역사')).toBe('사회/역사');
  });

  it('컴퓨터는 과학과 같은 과학/IT 다', () => {
    // 직업 독자 분야라 따로 두면 대부분에게 "안 읽은 분야"로 남았다(2026-10-31)
    expect(mapToMainCategory('국내도서-IT 모바일')).toBe('과학/IT');
    expect(mapToMainCategory('국내도서-자연과학')).toBe('과학/IT');
    // 예전에 대분류 이름 그대로 저장된 행
    expect(mapToMainCategory('컴퓨터/모바일')).toBe('과학/IT');
    expect(mapToMainCategory('과학')).toBe('과학/IT');
  });

  it('여행·요리·건강·취미는 기타가 아니라 예술/생활 이다', () => {
    expect(mapToMainCategory('국내도서-여행')).toBe('예술/생활');
    expect(mapToMainCategory('국내도서-가정 살림')).toBe('예술/생활');
    expect(mapToMainCategory('국내도서-건강 취미')).toBe('예술/생활');
    expect(mapToMainCategory('국내도서>요리/살림>집밥')).toBe('예술/생활');
    expect(mapToMainCategory('예술/대중문화')).toBe('예술/생활');
  });

  it('종교는 인문학이다', () => {
    expect(mapToMainCategory('국내도서-종교')).toBe('인문학');
  });

  it("영문 단어 안의 'it'을 컴퓨터로 오인하지 않는다", () => {
    expect(mapToMainCategory('외국도서>Literature & Fiction')).toBe('기타');
    expect(mapToMainCategory('외국도서>Fitness')).toBe('기타');
    expect(mapToMainCategory('국내도서-컴퓨터/IT')).toBe('과학/IT');
  });

  it('비어 있으면 기타', () => {
    expect(mapToMainCategory(null)).toBe('기타');
    expect(mapToMainCategory('')).toBe('기타');
  });
});

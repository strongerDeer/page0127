import {
  type MainCategory,
  mapToMainCategory,
} from '@/shared/lib/categoryMapper';

import {
  READING_PERSONALITY_TYPES,
  type ReadingPersonalityType,
} from './personalityTypes';

/** 홈 부제의 약속 — "기억나는 책 세 권을 골라보세요" */
export const FIRST_IMPRESSION_MIN_BOOKS = 3;

type TypeName =
  | '이야기에 사는 사람'
  | '마음의 결을 읽는 사람'
  | '세상을 넓히는 사람'
  | '내일의 나를 준비하는 사람'
  | '쉬지 않고 페이지를 넘기는 사람';

/**
 * 대분류 → 성향. AI 취향 노트와 같은 카탈로그를 쓴다 — 가입 뒤 노트가 나와도 언어가 이어진다.
 * '기타'는 분류 불명이라 어느 쪽으로도 세지 않는다.
 * 정독·문장·위로처럼 별점과 메모가 있어야 보이는 타입은 고르기만으로는 알 수 없어 뺐다.
 */
const TYPE_BY_CATEGORY: Record<Exclude<MainCategory, '기타'>, TypeName> = {
  '소설/시/희곡': '이야기에 사는 사람',
  에세이: '마음의 결을 읽는 사람',
  인문학: '세상을 넓히는 사람',
  '사회/역사': '세상을 넓히는 사람',
  '과학/IT': '세상을 넓히는 사람',
  '예술/생활': '세상을 넓히는 사람',
  자기계발: '내일의 나를 준비하는 사람',
  '경제/경영': '내일의 나를 준비하는 사람',
};

/** 서로 다른 성향이 이만큼 고르게 나오면 한쪽으로 기운 게 아니라 넓게 읽는 사람이다 */
const WIDE_SPECTRUM_TYPES = 3;

const findType = (name: TypeName): ReadingPersonalityType => {
  const type = READING_PERSONALITY_TYPES.find((t) => t.name === name);
  // 카탈로그 이름이 바뀌면 여기서 바로 터지게 한다 — 조용히 엉뚱한 타입을 내보내지 않는다
  if (!type) throw new Error(`성향 카탈로그에 없는 타입: ${name}`);
  return type;
};

/**
 * 고른 책들의 첫인상 — 3권 미만이거나 분류되는 책이 없으면 null.
 *
 * @param categories 고른 순서대로의 원본 분류 문자열 (예: '국내도서-소설/시/희곡')
 *
 * 1. 책마다 대분류 → 성향 하나로 센다
 * 2. 가장 많은 성향이 첫인상. 동률이면 먼저 고른 책의 성향 (고른 순서가 곧 기억의 순서다)
 * 3. 단, 서로 다른 성향이 3개 이상이고 모두 같은 수라면 "넓게 읽는 사람"
 */
export const toFirstImpression = (
  categories: (string | null)[]
): ReadingPersonalityType | null => {
  if (categories.length < FIRST_IMPRESSION_MIN_BOOKS) return null;

  // Map 은 넣은 순서를 지킨다 → 처음 등장한 순서가 동률 판정 기준이 된다
  const counts = new Map<TypeName, number>();
  for (const category of categories) {
    const main = mapToMainCategory(category);
    if (main === '기타') continue;
    const name = TYPE_BY_CATEGORY[main];
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const values = [...counts.values()];
  const max = Math.max(...values);
  const isEven = values.every((v) => v === max);
  if (counts.size >= WIDE_SPECTRUM_TYPES && isEven) {
    return findType('쉬지 않고 페이지를 넘기는 사람');
  }

  const [top] = [...counts.entries()].find(([, count]) => count === max)!;
  return findType(top);
};

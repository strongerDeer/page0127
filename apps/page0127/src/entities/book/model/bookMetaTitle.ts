/**
 * 책 정보 페이지 `<title>` 만들기.
 *
 * 서점 데이터는 제목 칸에 부제가, 저자 칸에 역할 표기·옮긴이가 붙어 온다.
 *   제목: "생각의 탄생 - 다빈치에서 파인먼까지 … 13가지 생각도구"
 *   저자: "로버트 루트번스타인, 미셸 루트번스타인 (지은이), 박종성 (옮긴이)"
 * 그대로 이으면 100자가 넘어 검색 결과에서 뒤가 잘린다(Bing 사이트 검사 "너무 긴 제목", 70자 기준).
 * 사람들이 실제로 검색하는 건 책 이름과 저자라서, 그 둘만 남긴다.
 * 화면 제목과 DB 는 건드리지 않는다 — 메타 제목에서만 다듬는다.
 */

/** 검색엔진이 자르지 않는 제목 길이 (Bing 사이트 검사 기준: 70자 이상이면 경고) */
export const META_TITLE_MAX = 69;

const SITE_SUFFIX = ' | page0127.';

/**
 * "생각의 탄생 - 부제" → "생각의 탄생"
 * "경비원입니다 (25만 부 기념 전면 개정판)" → "경비원입니다"
 * 다 떼고 나서 빈 문자열이 되면 원래 제목을 쓴다.
 */
export const stripSubtitle = (title: string): string => {
  const main = title
    .split(' - ')[0]
    // 끝에 붙은 판·기념 표기 괄호. 여러 개면 모두 뗀다
    .replace(/(\s*[([][^)\]]*[)\]])+\s*$/, '')
    .trim();
  return main || title.trim();
};

/**
 * 첫 사람 이름만.
 * "로버트 루트번스타인, 미셸 루트번스타인 (지은이), 박종성 (옮긴이)" → "로버트 루트번스타인"
 * "패트릭 브링리 저/김희정,조현주 역" → "패트릭 브링리"
 */
export const primaryAuthor = (author: string): string => {
  const first = author.split(/[,，/]/)[0] ?? '';
  return first
    .replace(/\(.*?\)/g, '')
    .replace(/\s+(저|지음|글|원저|엮음|편|역|옮김)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const bookMetaTitle = ({
  title,
  author,
}: {
  title: string;
  author: string | null;
}): string => {
  const name = stripSubtitle(title);
  const who = author ? primaryAuthor(author) : '';
  const core = who ? `${name} - ${who}` : name;

  // 다듬어도 긴 경우(제목 자체가 긴 책)의 안전장치 — 자르고 말줄임표
  const room = META_TITLE_MAX - SITE_SUFFIX.length;
  const fitted =
    core.length > room ? `${core.slice(0, room - 1).trimEnd()}…` : core;
  return `${fitted}${SITE_SUFFIX}`;
};

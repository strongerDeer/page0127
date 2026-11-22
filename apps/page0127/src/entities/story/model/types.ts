/**
 * 책 이야기 한 편의 정보 — HJ 가 읽은 책의 독후감 + 인물관계도.
 *
 * 글(독후감)은 같은 폴더의 index.mdx, 나머지(제목·책·그림·등장인물)는 meta.ts 에 둔다.
 * 둘을 나눈 이유: 책 정보 페이지는 "이 책에 이야기가 있나?"만 알면 되는데,
 * meta 를 MDX 안에 두면 그 질문 하나에 글 전체를 불러와야 한다.
 */
export type StoryImage = {
  /** public/ 기준 경로. 미리 webp 로 줄여 둔 파일 — Vercel 이미지 변환을 쓰지 않는다 */
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type StoryCharacterGroup = {
  /** 묶음 이름 (예: "현재 · 2023") */
  name: string;
  people: { name: string; role: string }[];
};

export type StoryMeta = {
  /** 주소: /stories/{slug} — 영문 소문자·숫자·하이픈 */
  slug: string;
  /** 페이지 h1·검색 제목. 사람들이 찾는 말("독후감", "인물관계도")을 그대로 넣는다 */
  title: string;
  /** 검색 결과·공유 미리보기 설명 (120자 안쪽) */
  description: string;
  /** global_books.id — 책 정보 페이지(/books/info/[id])와 서로 잇는 열쇠 */
  bookId: string;
  bookTitle: string;
  author: string;
  /** HJ 의 별점 (0~5, 서재 별점과 같은 척도) */
  rating: number;
  /** YYYY-MM-DD */
  publishedAt: string;
  updatedAt?: string;
  /** 인물관계도 — 원본 1장(PC·이미지 검색·확대)과 모바일용 카드 */
  characterMap: {
    full: StoryImage;
    /** 비어 있으면 모바일에서도 원본 1장을 보여 준다 */
    cards: StoryImage[];
  };
  /** 그림과 같은 내용을 글자로 — 검색엔진·AI 가 읽는 부분 */
  characters: StoryCharacterGroup[];
};

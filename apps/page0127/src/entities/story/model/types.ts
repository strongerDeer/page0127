/**
 * 책 이야기 한 편 — HJ 가 읽은 책의 독후감 + 인물관계도 (stories 테이블).
 *
 * 어드민(/admin/stories)에서 쓰고 저장하면 바로 /blog 에 보인다(HJ 2026-11-23 C안).
 */
export type StoryImage = {
  /** story-images 버킷 공개 URL 또는 public/ 기준 경로(/images/stories/...). 업로드 때 미리 줄인 WEBP */
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

/** 목록·책 정보 카드·사이트맵용 — 본문은 뺀다 */
export type StorySummary = {
  id: string;
  /** 주소: /blog/{slug} — 영문 소문자·숫자·하이픈 */
  slug: string;
  /** global_books.id — 책 정보 페이지(/books/info/[id])와 서로 잇는 열쇠 */
  bookId: string;
  bookTitle: string;
  author: string;
  /** 페이지 h1·검색 제목 */
  title: string;
  /** 검색 결과·공유 미리보기 설명 */
  description: string;
  /** 0 이면 별점을 그리지 않는다 */
  rating: number;
  /** 관계도 전체 그림. 없으면 관계도 칸을 그리지 않는다 */
  mapImage: StoryImage | null;
  /** ISO 시각. 공개 글은 늘 있다 */
  publishedAt: string;
  updatedAt: string;
};

export type Story = StorySummary & {
  /** 독후감 본문(마크다운) */
  body: string;
  /** 모바일용 분할 카드 — 비어 있으면 모바일에서도 원본 1장 */
  mapCards: StoryImage[];
  /** 그림과 같은 내용을 글자로 — 검색엔진·AI 가 읽는 부분 */
  characters: StoryCharacterGroup[];
};

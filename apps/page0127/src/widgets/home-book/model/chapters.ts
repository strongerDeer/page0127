/**
 * 홈 "한 권의 책"의 장 목록 (2026-11-17 HJ "홈을 한 권의 책으로", 시안 v9 의 쪽 구성)
 *
 * 한 장 = 한 화면 = 쪽 하나. 긴 섹션은 쪽 여러 장으로 나눈다(HJ "책 페이지 하나에 하나씩").
 *   표지 → 1 왜 page0127.인가요 → 2 책 고르기 → 3 내 책장 → 4 문장 → 5 공개 서재와 공유
 *   → 6 독서 케미 → 7 배지 → 8 라운지 → 뒤표지(맺음 문장·가입 버튼)
 * 문장 장은 2026-11-17 HJ 결정으로 추가(간직한 문장·오늘의 문장·문장 서랍·문장 카드 공유).
 * 머리글·쪽번호·목차·이전/다음 장 버튼이 모두 이 목록 하나를 본다 —
 * 쪽을 빼거나 순서를 바꿀 때 여기만 고치면 번호가 어긋나지 않는다.
 */

export type ChapterId =
  'why' | 'pick' | 'shelf' | 'sentence' | 'share' | 'chem' | 'badge' | 'lounge';

export type BookChapter = {
  id: ChapterId;
  /** 목차·머리글에 쓰는 장 이름 ("제2장" 같은 번호는 label 에) */
  title: string;
  /** "제1장" */
  label: string;
  /** 쪽번호 — 1부터, 표지는 세지 않는다 */
  folio: number;
  /** 화면에서 이 장으로 가는 앵커 id (`#book-ch-why`) */
  anchor: string;
};

/** 맛보기 — A 는 책 고르기·내 책장 두 쪽, B(인생책 찾기)는 한 쪽, 회원은 없음 */
export type PreviewKind = 'a' | 'b' | null;

type ChapterSeed = { id: ChapterId; title: string };

const WHY: ChapterSeed = { id: 'why', title: '왜 page0127.인가요' };
const FEATURES: readonly ChapterSeed[] = [
  { id: 'sentence', title: '간직한 문장' },
  { id: 'share', title: '공개 서재와 공유' },
  { id: 'chem', title: '독서 케미' },
  { id: 'badge', title: '배지' },
  { id: 'lounge', title: '라운지' },
];

const previewSeeds = (preview: PreviewKind): ChapterSeed[] => {
  if (preview === 'a')
    return [
      { id: 'pick', title: '당신의 첫인상' },
      { id: 'shelf', title: '내 책장' },
    ];
  if (preview === 'b') return [{ id: 'pick', title: '당신의 인생책' }];
  return [];
};

/** 앵커 id — 섹션 자체의 id(#first-impression 등)와 겹치지 않게 접두사를 붙인다 */
export const chapterAnchor = (id: ChapterId) => `book-ch-${id}`;

/**
 * 이 방문자가 보는 장들. 맛보기는 비회원에게만 있어서(회원은 체험할 이유가 없다)
 * 회원이면 그 쪽이 빠지고 번호가 당겨진다.
 */
export const buildChapters = ({
  preview,
}: {
  preview: PreviewKind;
}): BookChapter[] =>
  [WHY, ...previewSeeds(preview), ...FEATURES].map((c, i) => ({
    ...c,
    label: `제${i + 1}장`,
    folio: i + 1,
    anchor: chapterAnchor(c.id),
  }));

/** 앞뒤 장 — 첫 장의 앞, 마지막 장의 뒤는 null */
export const neighborsOf = (chapters: BookChapter[], id: ChapterId) => {
  const i = chapters.findIndex((c) => c.id === id);
  return {
    prev: i > 0 ? chapters[i - 1] : null,
    next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : null,
  };
};

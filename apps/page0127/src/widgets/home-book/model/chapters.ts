/**
 * 홈 "한 권의 책"의 장 목록 (2026-11-17 HJ "홈을 한 권의 책으로" ② 장 넘김)
 *
 * 홈의 섹션 하나가 한 장이다. 머리글·쪽번호·목차·이전/다음 장 버튼이 모두 이 목록 하나를 본다 —
 * 섹션을 빼거나 순서를 바꿀 때 여기만 고치면 번호가 어긋나지 않는다.
 */

export type ChapterId = 'why' | 'first-impression' | 'highlights' | 'closing';

export type BookChapter = {
  id: ChapterId;
  /** 목차·머리글에 쓰는 장 이름 ("제2장" 같은 번호는 label 에) */
  title: string;
  /** "제1장" · 마지막 장은 "맺음" */
  label: string;
  /** 쪽번호 — 1부터, 표지는 세지 않는다 */
  folio: number;
  /** 화면에서 이 장으로 가는 앵커 id (`#book-ch-why`) */
  anchor: string;
};

type ChapterSeed = { id: ChapterId; title: string };

const ALL: readonly ChapterSeed[] = [
  { id: 'why', title: '왜 page0127.인가요' },
  { id: 'first-impression', title: '당신의 첫인상' },
  { id: 'highlights', title: '책장이 쌓이면 보이는 것들' },
  { id: 'closing', title: '오늘 한 권부터' },
];

/** 앵커 id — 섹션 자체의 id(#first-impression 등)와 겹치지 않게 접두사를 붙인다 */
export const chapterAnchor = (id: ChapterId) => `book-ch-${id}`;

/**
 * 이 방문자가 보는 장들. 맛보기는 비회원에게만 있어서(회원은 체험할 이유가 없다)
 * 회원이면 한 장이 빠지고 번호가 당겨진다.
 */
export const buildChapters = ({
  withPreview,
}: {
  withPreview: boolean;
}): BookChapter[] => {
  const seeds = ALL.filter((c) => withPreview || c.id !== 'first-impression');
  return seeds.map((c, i) => {
    const isLast = i === seeds.length - 1;
    return {
      ...c,
      label: isLast ? '맺음' : `제${i + 1}장`,
      folio: i + 1,
      anchor: chapterAnchor(c.id),
    };
  });
};

/** 앞뒤 장 — 첫 장의 앞, 마지막 장의 뒤는 null */
export const neighborsOf = (chapters: BookChapter[], id: ChapterId) => {
  const i = chapters.findIndex((c) => c.id === id);
  return {
    prev: i > 0 ? chapters[i - 1] : null,
    next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : null,
  };
};

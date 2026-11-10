import type { DailySentence } from '@/entities/daily-sentence';

/** 오늘의 문장 기록 한 달 묶음 — "2026년 11월" */
export type DrawMonth = {
  /** 'YYYY-MM' — key 와 정렬 기준 */
  month: string;
  label: string;
  draws: DailySentence[];
};

/**
 * 뽑은 문장을 달별로 묶는다. 최신 달이 위, 달 안에서도 최신 날짜가 위.
 * draw_date 는 서울 기준 'YYYY-MM-DD' 문자열이라 Date 로 바꾸지 않고 잘라 쓴다
 * (Date 로 바꾸면 서버 시간대에 따라 하루가 밀릴 수 있다).
 */
export const groupDrawsByMonth = (
  draws: readonly DailySentence[]
): DrawMonth[] => {
  const months = new Map<string, DailySentence[]>();
  for (const draw of draws) {
    const month = draw.draw_date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), draw]);
  }

  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => {
      const [year, mm] = month.split('-');
      return {
        month,
        label: `${year}년 ${Number(mm)}월`,
        draws: [...list].sort((a, b) => b.draw_date.localeCompare(a.draw_date)),
      };
    });
};

/** '2026-11-10' → '11월 10일' */
export const formatDrawDay = (drawDate: string): string => {
  const [, mm, dd] = drawDate.split('-');
  return `${Number(mm)}월 ${Number(dd)}일`;
};

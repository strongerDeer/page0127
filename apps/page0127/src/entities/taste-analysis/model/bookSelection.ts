/**
 * 취향 분석에 넣을 책을 고르는 기준
 *
 * 학습 포인트:
 * - "최근 행동에 더 큰 무게"(recency weighting)를 LLM 에게 숫자 대신 **섹션**으로 전달한다
 * - 많이 읽은 사람만 영향을 받고, 책이 적은 사람은 전부 "요즘 읽은 책"에 들어가 예전과 같다
 *
 * 왜 둘로 나누나: 예전에는 최근 완독 100권을 한 목록으로 보냈다. AI 는 날짜를 모르니
 * 지난주 책과 3년 전 책을 같은 무게로 읽어서, 요즘 취향이 바뀌어도 결과가 따라오지 않았다.
 * 그렇다고 최근 책만 보내면 오래전 인생책(취향의 뿌리)이 사라진다 → 대표작만 따로 붙인다.
 */

/** "요즘 읽은 책" — 완독일 최근 순으로 이만큼 */
export const RECENT_BOOKS_FOR_ANALYSIS = 40;

/** "오래 남은 책" — 그보다 앞서 읽은 인생책·5점 중 최대 이만큼 */
export const LASTING_BOOKS_FOR_ANALYSIS = 10;

/**
 * 분석 결과에 남기는 선정 기준 이름.
 * 취향 변화 기록에서 "취향이 변한 건지, 기준이 변한 건지" 나중에 구분하려고 남긴다.
 * 이 이름이 없는 옛 분석은 "최근 완독 100권 한 목록" 기준이다.
 */
export const BOOK_SELECTION_VERSION = 'recent40-lasting10' as const;

/** 프롬프트에서 책이 들어가는 칸 */
export type BookPeriod = 'recent' | 'lasting';

/** preference_profile.selection 에 저장하는 값 */
export type BookSelectionMeta = {
  version: typeof BOOK_SELECTION_VERSION;
  recent_count: number;
  lasting_count: number;
};

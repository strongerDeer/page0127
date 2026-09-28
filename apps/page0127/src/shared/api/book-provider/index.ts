import { aladinProvider } from './aladin';
import { yes24Provider } from './yes24';

import type { BookProvider, BookSource } from './types';

export type {
  BookProvider,
  BookSource,
  ProviderBook,
  ProviderSearchResult,
  SearchOptions,
} from './types';
export { BOOK_SOURCES } from './types';
export {
  buildYes24BackUrl,
  buildYes24CoverUrl,
  buildYes24SpineUrl,
  isYes24PlaceholderImage,
} from './yes24Image';

/**
 * 도서 공급자 선택 — 교체 지점은 여기 한 곳이다.
 *
 * 기본은 YES24. 알라딘은 2026-10-30에 종료되므로 되돌릴 곳이 아니라
 * **그날까지의 비상구**다. YES24 쪽에 문제가 생기면 `BOOK_PROVIDER=aladin` 으로
 * 환경변수만 바꿔 배포 없이 되돌릴 수 있게 열어 둔다 — 종료일이 지나면
 * 이 비상구도 닫힌다.
 *
 * 학습 포인트:
 * - 알 수 없는 값이 오면 조용히 기본값으로 떨어지지 않고 경고를 남긴다.
 *   오타(`yes-24`)가 조용히 통과하면 "왜 아직 알라딘을 쓰지?"를 며칠 뒤에 깨닫는다.
 */
export const getBookProvider = (): BookProvider => {
  const configured = process.env.BOOK_PROVIDER as BookSource | undefined;

  if (!configured) return yes24Provider;

  if (configured === 'aladin') return aladinProvider;
  if (configured === 'yes24') return yes24Provider;

  console.warn(
    `BOOK_PROVIDER 값을 알아볼 수 없습니다: ${configured} — YES24로 진행합니다.`
  );
  return yes24Provider;
};

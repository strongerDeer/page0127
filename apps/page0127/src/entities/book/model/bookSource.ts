import type { BookSource } from '@/shared/api/book-provider';

/**
 * 도서정보 출처 표기
 *
 * 왜 필요한가: **약관상 의무다.** YES24 Open API 이용약관은 도서가 노출되는 화면에
 *   (1) 회사를 출처로 표기할 것
 *   (2) 해당 상품의 상품 상세페이지로 연결되는 링크를 제공할 것
 * 을 요구한다. API 신청서에도 지키겠다고 적어 제출했다.
 *
 * 알라딘도 같은 성격의 표기를 요구했으므로, 알라딘에서 온 옛 책에도 함께 적는다.
 *
 * 학습 포인트:
 * - 링크 규칙을 컴포넌트 안에 흩어 두면 화면마다 달라진다. 순수 함수로 모아
 *   테스트로 잠근 뒤, UI 는 결과만 받아 그린다
 */

export type BookCredit = {
  /** 화면에 적을 출처 이름 */
  providerName: string;
  /** 상품 상세페이지. 상품번호가 없으면 ISBN 검색으로 떨어진다 */
  href: string;
  /** 상품번호로 만든 정확한 상세페이지인지 (아니면 검색 결과로 보낸다) */
  isExact: boolean;
};

const PROVIDER_NAMES: Record<BookSource, string> = {
  yes24: 'YES24',
  aladin: '알라딘',
  manual: '직접 입력',
};

/**
 * 출처 표기에 필요한 것들을 만든다. 표기할 게 없으면 `null`.
 *
 * `manual`(사용자가 직접 입력한 책)은 서점에서 온 정보가 아니므로 표기하지 않는다 —
 * 있지도 않은 출처를 적는 것이 약관을 지키는 것보다 나쁘다.
 *
 * `source` 가 비어 있는 옛 행도 `null` 이다. 이 책들은 백필이 출처를 채워 넣기
 * 전까지 표기가 없는데, **모르는 출처를 YES24 라고 적는 것보다 비워 두는 편이 옳다.**
 */
export const toBookCredit = (
  source: string | null | undefined,
  providerItemId: string | null | undefined,
  isbn: string
): BookCredit | null => {
  if (source !== 'yes24' && source !== 'aladin') return null;

  const providerName = PROVIDER_NAMES[source];

  if (source === 'yes24') {
    return providerItemId
      ? {
          providerName,
          href: `https://www.yes24.com/product/goods/${providerItemId}`,
          isExact: true,
        }
      : {
          providerName,
          href: `https://www.yes24.com/product/search?query=${encodeURIComponent(isbn)}`,
          isExact: false,
        };
  }

  // 알라딘은 상품번호를 저장해 두지 않았다(응답의 link 를 쓰지 않았다).
  // ISBN 검색이 그 책으로 가는 가장 정확한 경로다.
  return {
    providerName,
    href: `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${encodeURIComponent(isbn)}`,
    isExact: false,
  };
};

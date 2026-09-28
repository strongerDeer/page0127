/**
 * ISBN13 유효성 검사
 *
 * 왜 필요한가: `global_books.isbn` 이 UNIQUE 키인데, 공급자 응답에는 ISBN 자리에
 * **자리표시자나 ISSN 이 들어 있는 상품**이 섞여 온다. 그대로 저장하면 서로 다른
 * 책이 한 행으로 뭉개져 서로를 덮어쓴다.
 *
 * 2026-09-28 실측 (YES24 검색 결과 480건):
 *   - ISBN 빈 값          6.9%  세트 상품
 *   - 978/979 아님        5.2%  **전부 잡지**. `977` 은 ISSN 이다
 *   - 체크섬 불일치       0.0%
 *   - 정상                87.9%
 *
 * 잡지를 막는 건 손실처럼 보이지만, 실제로는 **같은 번호가 여러 호에 중복된다** —
 * `9771739361205` 하나에 어린이과학동아 18호·19호가 걸리고, 어떤 잡지는 A/B/C/D형
 * 네 상품이 전부 같은 번호였다. 담아 봐야 호 구분이 안 되고 서로를 덮어쓴다.
 *
 * 학습 포인트:
 * - ISBN13 마지막 자리는 앞 12자리로 계산하는 체크digit 이다
 *   (가중치 1,3,1,3,... 로 더한 뒤 10의 보수)
 */

/** 도서용 ISBN13 은 978 또는 979 로 시작한다. 977 은 잡지(ISSN)다. */
const ISBN13_SHAPE = /^97[89]\d{10}$/;

export const isValidIsbn13 = (value: string | null | undefined): boolean => {
  if (!value) return false;

  const digits = value.trim();
  if (!ISBN13_SHAPE.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(digits[12]);
};

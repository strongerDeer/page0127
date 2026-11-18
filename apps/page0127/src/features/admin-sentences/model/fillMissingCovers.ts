import { paceCalls } from './paceCalls';
import { isAllowedCoverUrl } from './sentenceForm';

/**
 * CSV 로 올린 문장 중 표지가 빈 줄을 ISBN 으로 채운다 (HJ, 2026-11-18).
 *
 * 왜 서버에서 채우나:
 *   서점 「책 속에서」 문구에는 표지 주소가 없어 123개를 하나하나 고르기 어렵다.
 *   ISBN 은 다 있으니, 책 추가 화면과 같은 서점 조회(getByIsbn)로 표지를 찾는다.
 *
 * - 같은 ISBN 은 한 번만 찾는다(한 책에서 문장 여러 개).
 * - paceCalls 로 2개씩 천천히 — 서점 API 를 한꺼번에 두드리면 429 로 막힌다(2026-11-18).
 * - 못 찾거나 실패하면 표지 없이 넣는다(문장 저장을 막지 않는다).
 * - 이미 표지가 있는 줄은 건드리지 않는다.
 * - CSV 로 넣을 줄과 이미 풀에 있는 줄(표지 채우기 버튼) 둘 다 쓴다 — isbn·cover_image 만 본다.
 */
export type CoverLookup = (isbn: string) => Promise<string | null>;

type CoverRow = { isbn: string | null; cover_image: string | null };

export const fillMissingCovers = async <T extends CoverRow>(
  rows: T[],
  lookup: CoverLookup
): Promise<{ rows: T[]; filled: number }> => {
  const isbns = [
    ...new Set(
      rows
        .filter((row) => !row.cover_image && row.isbn)
        .map((row) => row.isbn as string)
    ),
  ];

  const covers = new Map<string, string>();
  const found = await paceCalls(isbns, lookup);
  isbns.forEach((isbn, index) => {
    const result = found[index];
    const url = result.status === 'fulfilled' ? result.value : null;
    // 표지 주소는 화면에서 next/image 로 그린다 — 허용한 호스트만 받는다
    if (url && isAllowedCoverUrl(url)) covers.set(isbn, url);
  });

  let filled = 0;
  const next = rows.map((row) => {
    if (row.cover_image || !row.isbn) return row;
    const cover = covers.get(row.isbn);
    if (!cover) return row;
    filled += 1;
    return { ...row, cover_image: cover };
  });
  return { rows: next, filled };
};

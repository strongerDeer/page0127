import type { PublicTasteHistoryItem } from '../types';

/**
 * 옛 취향 분석의 근거 책에 YES24 상품번호를 채운다 — 읽을 때 보완(저장된 분석은 그대로).
 *
 * 왜 필요한가: 2026-11-23(#490) 전에 저장된 분석의 근거 책에는 provider_item_id 가 없다.
 * 그러면 toCoverSource 가 YES24 작은 사본(M·L, 7~19KB) 대신 Storage 사본(폭 500px,
 * 36~72KB)을 그린다(프로필 실측 3장). 분석을 다시 돌리지 않아도 가벼워지도록,
 * 화면에 내보내기 전에 책(books)에서 번호를 찾아 붙인다.
 *
 * 순수 함수로 둔 이유: 조회(lookup)만 바꿔 끼우면 테스트에서 DB 없이 확인할 수 있다.
 * 빠진 책이 없으면 lookup 을 부르지 않는다 — 새 분석만 있는 서재는 추가 조회 0번.
 */
export const missingEvidenceBookIds = (
  items: PublicTasteHistoryItem[]
): string[] => {
  const ids = new Set<string>();
  for (const item of items) {
    for (const e of item.evidence ?? []) {
      if (e.provider_item_id === undefined && e.book_id) ids.add(e.book_id);
    }
  }
  return [...ids];
};

export const fillEvidenceProviderIds = async (
  items: PublicTasteHistoryItem[],
  lookup: (bookIds: string[]) => Promise<Map<string, string | null>>
): Promise<PublicTasteHistoryItem[]> => {
  const missing = missingEvidenceBookIds(items);
  if (missing.length === 0) return items;

  const byId = await lookup(missing);
  if (byId.size === 0) return items;

  return items.map((item) =>
    item.evidence
      ? {
          ...item,
          evidence: item.evidence.map((e) =>
            e.provider_item_id === undefined && byId.has(e.book_id)
              ? { ...e, provider_item_id: byId.get(e.book_id) ?? null }
              : e
          ),
        }
      : item
  );
};

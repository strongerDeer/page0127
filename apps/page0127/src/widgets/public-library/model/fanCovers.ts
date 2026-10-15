import { dedupeReadings } from '@/entities/book';

import type { Book } from '@/entities/book';

const FAN_SIZE = 3;

/**
 * 가입 배너 부채꼴 — 주인의 공개 완독 책 중 가장 최근 3권.
 * - 재독은 한 권으로 합친다: 같은 표지가 두 장 서면 부채꼴이 어색하다
 * - 저장된 표지(cover_image)가 있는 책만: provider_item_id 만으로는
 *   toCoverSource 가 src 를 만들지 않아 빈 칸이 된다
 */
export const pickFanCovers = (books: Book[]): Book[] =>
  dedupeReadings(
    books.filter(
      (book) =>
        book.status === 'completed' && book.completed_date && book.cover_image
    )
  )
    .sort((a, b) =>
      (b.completed_date ?? '').localeCompare(a.completed_date ?? '')
    )
    .slice(0, FAN_SIZE);

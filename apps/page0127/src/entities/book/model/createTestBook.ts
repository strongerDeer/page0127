import type { Book } from '../types';

/**
 * 테스트 전용 Book 픽스처.
 * isbn 을 매번 새로 만든다 — 통계는 같은 ISBN 을 한 책의 회독으로 합치므로
 * 고정값이면 서로 다른 책이 한 권으로 뭉친다. 재독을 테스트하려면 isbn 을 같게 준다.
 */
export const createTestBook = (overrides: Partial<Book> = {}): Book => ({
  id: crypto.randomUUID(),
  user_id: 'user-id',
  isbn: crypto.randomUUID(),
  title: '테스트 책',
  sub_title: null,
  source: null,
  provider_item_id: null,
  thickness_mm: null,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  description: null,
  pub_date: null,
  category: '소설',
  page_count: 100,
  toc: null,
  status: 'completed',
  read_count: 1,
  start_date: null,
  completed_date: null,
  completed_year: null,
  rating: null,
  is_life_book: false,
  one_line_review: null,
  personal_memo: null,
  tags: null,
  is_public: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

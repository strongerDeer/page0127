import { expect, test } from 'vitest';

import { buildActivityItems } from './buildActivityItems';

const baseActivity = {
  id: 'a1',
  user_id: 'u1',
  activity_type: 'book_added' as const,
  book_id: 'b1',
  content: null,
  created_at: '2026-07-24T00:00:00Z',
};

test('활동에 프로필·책·좋아요를 조합한다', () => {
  const [item] = buildActivityItems({
    activities: [baseActivity],
    profiles: [{ id: 'u1', nickname: '철수', photo_url: null }],
    books: [{ id: 'b1', title: '책제목', author: '저자', cover_image: null, status: 'reading', rating: null }],
    likes: [{ activity_id: 'a1', user_id: 'u2' }],
    currentUserId: 'u1',
  });

  expect(item.user.nickname).toBe('철수');
  expect(item.book?.title).toBe('책제목');
  expect(item.likes).toEqual({ count: 1, isLiked: false });
});

test('현재 사용자가 누른 좋아요는 isLiked=true', () => {
  const [item] = buildActivityItems({
    activities: [baseActivity],
    profiles: [{ id: 'u1', nickname: '철수', photo_url: null }],
    books: [{ id: 'b1', title: '책', author: '저자', cover_image: null, status: 'reading', rating: null }],
    likes: [{ activity_id: 'a1', user_id: 'u1' }],
    currentUserId: 'u1',
  });

  expect(item.likes).toEqual({ count: 1, isLiked: true });
});

test('책 정보가 없으면 book=null', () => {
  const [item] = buildActivityItems({
    activities: [baseActivity],
    profiles: [],
    books: [],
    likes: [],
    currentUserId: null,
  });

  expect(item.book).toBeNull();
  expect(item.user.nickname).toBeNull();
  expect(item.likes).toEqual({ count: 0, isLiked: false });
});

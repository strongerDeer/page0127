import { describe, expect, it } from 'vitest';

import { buildActivityItems } from './buildActivityItems';

const activities = [
  {
    id: 'a1',
    user_id: 'u1',
    activity_type: 'book_completed' as const,
    book_id: 'b1',
    content: null,
    created_at: '2026-07-20T00:00:00+00:00',
  },
];

const profiles = [
  { id: 'u1', nickname: '경민', username: 'kyungmin', photo_url: null },
];

const books = [
  {
    id: 'b1',
    title: '변신',
    author: '카프카',
    cover_image: null,
    status: 'completed',
    rating: 5,
    is_life_book: false,
    one_line_review: '읽고 나면 아침이 달라진다',
  },
];

describe('buildActivityItems', () => {
  it('좋아요를 활동이 아니라 책 단위로 센다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [
        { book_id: 'b1', user_id: 'u1' },
        { book_id: 'b1', user_id: 'u2' },
        { book_id: 'b9', user_id: 'u3' }, // 다른 책 — 세면 안 된다
      ],
      comments: [],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u2',
    });

    expect(item.likes).toEqual({ count: 2, isLiked: true });
  });

  it('댓글 수는 그 책의 전체 댓글이다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        {
          book_id: 'b1',
          user_id: 'u2',
          created_at: '2026-07-21T00:00:00+00:00',
        },
        {
          book_id: 'b1',
          user_id: 'u3',
          created_at: '2026-07-22T00:00:00+00:00',
        },
        {
          book_id: 'b9',
          user_id: 'u3',
          created_at: '2026-07-22T00:00:00+00:00',
        },
      ],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.commentCount).toBe(2);
  });

  it('새 댓글은 마지막 열람 이후 + 내가 쓴 것을 뺀 수다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        // 읽기 전 — 새 댓글 아님
        {
          book_id: 'b1',
          user_id: 'u2',
          created_at: '2026-07-21T00:00:00+00:00',
        },
        // 읽은 뒤 남이 쓴 것 — 새 댓글
        {
          book_id: 'b1',
          user_id: 'u2',
          created_at: '2026-07-24T00:00:00+00:00',
        },
        // 읽은 뒤 내가 쓴 것 — 내 글은 세지 않는다
        {
          book_id: 'b1',
          user_id: 'u1',
          created_at: '2026-07-25T00:00:00+00:00',
        },
      ],
      threadReads: [
        { book_id: 'b1', last_read_at: '2026-07-23T00:00:00+00:00' },
      ],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.newCommentCount).toBe(1);
  });

  it('한 번도 열지 않은 스레드는 남이 쓴 댓글 전부가 새 댓글이다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        {
          book_id: 'b1',
          user_id: 'u2',
          created_at: '2026-07-21T00:00:00+00:00',
        },
        {
          book_id: 'b1',
          user_id: 'u1',
          created_at: '2026-07-22T00:00:00+00:00',
        },
      ],
      threadReads: [], // 열람 기록 없음
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.newCommentCount).toBe(1);
  });

  it('마이크로초 유무가 갈려도 열람 시각 비교가 뒤집히지 않는다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        // 열람(05:00:00)보다 나중이다 — localeCompare 로 비교하면 이전으로 판정된다
        {
          book_id: 'b1',
          user_id: 'u2',
          created_at: '2026-07-23T05:00:00.123456+00:00',
        },
      ],
      threadReads: [
        { book_id: 'b1', last_read_at: '2026-07-23T05:00:00+00:00' },
      ],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.newCommentCount).toBe(1);
  });

  it('책 이벤트는 시간순으로 싣고 한줄평을 리뷰 본문으로 준다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [],
      threadReads: [],
      bookEvents: [
        {
          book_id: 'b1',
          activity_type: 'book_completed',
          created_at: '2026-07-20T00:00:00+00:00',
        },
        {
          book_id: 'b1',
          activity_type: 'book_added',
          created_at: '2026-07-01T00:00:00+00:00',
        },
        {
          book_id: 'b9',
          activity_type: 'book_added',
          created_at: '2026-07-02T00:00:00+00:00',
        },
      ],
      currentUserId: 'u1',
    });

    expect(item.bookEvents).toEqual([
      { activityType: 'book_added', createdAt: '2026-07-01T00:00:00+00:00' },
      {
        activityType: 'book_completed',
        createdAt: '2026-07-20T00:00:00+00:00',
      },
    ]);
    expect(item.reviewContent).toBe('읽고 나면 아침이 달라진다');
  });

  it('책 정보가 없으면 book은 null이고 리뷰 본문도 null이다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books: [], // 조회에서 빠진 경우(비공개 등)
      likes: [{ book_id: 'b1', user_id: 'u2' }],
      comments: [
        {
          book_id: 'b1',
          user_id: 'u2',
          created_at: '2026-07-21T00:00:00+00:00',
        },
      ],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.book).toBeNull();
    expect(item.reviewContent).toBeNull();
  });

  it('닉네임이 없으면 username으로 대체한다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles: [
        { id: 'u1', nickname: null, username: 'kyungmin', photo_url: null },
      ],
      books,
      likes: [],
      comments: [],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.user.nickname).toBe('kyungmin');
  });

  // 표시용 nickname 과 달리 링크 경로용 username 은 폴백하면 안 된다.
  // 없는 값으로 /{username}/{bookId} 를 만들면 404가 된다.
  it('username은 표시용 닉네임과 별개로 그대로 싣는다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles: [
        { id: 'u1', nickname: '경민', username: 'kyungmin', photo_url: null },
      ],
      books,
      likes: [],
      comments: [],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.user.nickname).toBe('경민');
    expect(item.user.username).toBe('kyungmin');
  });

  it('프로필이 없으면 username은 null이다 (닉네임으로 대체하지 않는다)', () => {
    const [item] = buildActivityItems({
      activities,
      profiles: [],
      books,
      likes: [],
      comments: [],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.user.username).toBeNull();
  });
});

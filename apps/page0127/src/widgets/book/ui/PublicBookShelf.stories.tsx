import { createTestBook } from '@/entities/book/model/createTestBook';

import { PublicBookShelf } from './PublicBookShelf';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/** 네트워크 없이 그리는 가짜 표지 — 색 상자에 제목만 */
const fakeCover = (title: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="340" height="480" fill="url(#g)"/><text x="170" y="150" text-anchor="middle" font-size="34" font-weight="700" fill="#1b1d22" font-family="sans-serif">${title}</text></svg>`
  )}`;

const meta = {
  title: 'Widgets/Book/책장',
  component: PublicBookShelf,
  args: {
    username: 'me',
    compact: true,
    plateLabel: '2026',
    books: [
      createTestBook({
        title: '공개한 인생책',
        rating: 5,
        is_life_book: true,
        is_public: true,
        cover_image: fakeCover('공개한 책', '#e8d3b0', '#c47a4a'),
      }),
      createTestBook({
        title: '비공개로 둔 책',
        rating: 5,
        is_life_book: true,
        is_public: false,
        cover_image: fakeCover('비공개 책', '#cfe3f2', '#3f6fa6'),
      }),
      createTestBook({
        title: '나만의 책',
        rating: 5,
        is_life_book: true,
        is_public: false,
        catalog_review_status: 'pending',
        cover_image: null,
      }),
      createTestBook({
        title: '책등으로 꽂힌 비공개 책',
        rating: 3,
        is_public: false,
        spine_image: null,
        thickness_mm: 24,
      }),
      createTestBook({
        title: '공개 책등',
        rating: 3,
        is_public: true,
        spine_image: null,
        thickness_mm: 20,
      }),
    ],
  },
  decorators: [
    (Story) => (
      <div className='mx-auto max-w-3xl p-5'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PublicBookShelf>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 주인 책장 — 방문자에게 안 보이는 책은 퀼팅 커버를 씌운다 */
export const OwnerWithPrivateBooks: Story = {};

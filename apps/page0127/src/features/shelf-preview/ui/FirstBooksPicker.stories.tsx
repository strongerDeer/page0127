import { expect, userEvent, within } from 'storybook/test';

import { FirstBooksPicker } from './FirstBooksPicker';

import type { ShelfPick } from '../model/types';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const CATEGORIES = [
  '소설',
  '에세이',
  '인문',
  '경제경영',
  '과학',
  '시',
  '자기계발',
  '역사',
];

// 표지 주소 없이 제목 칸으로 그린다 — 외부 이미지에 기대지 않게
const picks: ShelfPick[] = CATEGORIES.map((category, i) => ({
  book: {
    isbn: `97900000000${i}`,
    provider_item_id: null,
    title: `${category} 책 ${i + 1}`,
    author: '지은이',
    publisher: null,
    cover_image: null,
    spine_image: null,
    pub_date: null,
    category,
    source: 'yes24',
  },
  coverSrc: null,
  coverFallback: null,
  spineSrc: null,
}));

const meta = {
  title: 'Features/ShelfPreview/FirstBooksPicker',
  component: FirstBooksPicker,
  args: { picks, target: '/bookworm' },
  decorators: [
    (Story) => (
      <div className='mx-auto max-w-xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FirstBooksPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 막 가입한 사람이 보는 첫 화면 — 아직 아무것도 안 골랐다 */
export const Empty: Story = {
  name: '처음 (0권)',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 고르기 전엔 "선택 완료"가 꺼져 있고, 건너뛰기는 보조로 늘 있다
    await expect(
      await canvas.findByRole('button', { name: '건너뛰기' })
    ).toBeEnabled();
    await expect(
      canvas.getByRole('button', { name: /선택 완료/ })
    ).toBeDisabled();
  },
};

/** 두 권 고르면 남은 권수, 선택 완료 버튼에 권수가 붙는다 */
export const TwoPicked: Story = {
  name: '두 권 고름',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: '소설 책 1' })
    );
    await userEvent.click(canvas.getByRole('button', { name: '에세이 책 2' }));
    // 데스크톱 책장과 모바일 하단 줄이 같은 안내를 낸다 — 둘 중 하나만 화면에 보인다
    await expect(
      canvas.getAllByText('1권만 더 고르면 첫인상이 나와요').length
    ).toBeGreaterThan(0);
    await expect(
      canvas.getByRole('button', { name: /선택 완료\s*2권/ })
    ).toBeEnabled();
  },
};

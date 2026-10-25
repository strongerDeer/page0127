import { TasteClashCard } from './TasteClashCard';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
const meta = {
  title: 'Features/TasteClash/취향 대격돌',
  component: TasteClashCard,
  args: { clash: null },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 410 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TasteClashCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Clash: Story = {
  args: {
    otherName: '지수',
    mineUsername: 'me',
    otherUsername: 'jisu',
    clash: {
      mineBookId: 'mine',
      otherBookId: 'other',
      otherUserId: 'jisu',
      title: '같은 책인데 이렇게 다르다고?',
      author: '어떤 작가',
      coverImage: null,
      providerItemId: null,
      isbn: '123',
      mineRating: 5,
      otherRating: 2,
    },
  },
};

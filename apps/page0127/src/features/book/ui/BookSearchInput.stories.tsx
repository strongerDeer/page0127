import { useState } from 'react';

import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { BookSearchInput } from './BookSearchInput';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/Book/도서 검색창',
  component: BookSearchInput,
  args: { onSearch: fn() },
} satisfies Meta<typeof BookSearchInput>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 부모가 렌더마다 새 onSearch 를 내려주고, 검색하면 부모 상태가 바뀌는 상황.
 * (도서 추가 페이지가 그랬다 — 검색 → "검색 중" 리렌더 → 새 함수 → 또 검색 …)
 *
 * onSearch 가 `count` 를 클로저로 잡고 있어서 React Compiler 가 켜져 있어도
 * 함수 참조가 매번 바뀐다. 검색창은 그래도 검색어 하나당 한 번만 불러야 한다.
 */
const UnstableParent = ({ onSearch }: { onSearch: (q: string) => void }) => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <BookSearchInput
        onSearch={(q) => {
          setCount(count + 1);
          onSearch(q);
        }}
      />
      <p>검색 {count}번</p>
    </div>
  );
};

export const SearchesOncePerQuery: Story = {
  name: '부모가 매번 새 함수를 줘도 검색어당 한 번만 검색',
  render: (args) => <UnstableParent onSearch={args.onSearch} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), '방구');

    // 400ms 디바운스 뒤 한 번 검색된다
    await waitFor(() => expect(args.onSearch).toHaveBeenCalledWith('방구'));

    // 잠시 기다려도 같은 검색어로 다시 부르지 않는다(예전엔 여기서 수천 번)
    await new Promise((r) => setTimeout(r, 800));
    await expect(args.onSearch).toHaveBeenCalledTimes(1);
    await expect(canvas.getByText('검색 1번')).toBeInTheDocument();
  },
};

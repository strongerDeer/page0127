import { expect, within } from 'storybook/test';

import { ChemistryLoading } from './ChemistryLoading';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/Compatibility/케미 분석 중',
  component: ChemistryLoading,
  args: { targetName: '강해진' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ChemistryLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 막 시작 — 책등 한 권, 첫 문구 */
export const 시작: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '두 분의 책장을 꺼내 오고 있어요'
    );
  },
};

/** 15초쯤 — 책장이 절반쯤 차고 겹치는 책이 켜진다 */
export const 중간: Story = { args: { initialElapsed: 15 } };

/** 응답이 늦을 때 — 마지막 한 칸은 비워 두고 안내 문구가 바뀐다 */
export const 늦어질때: Story = {
  args: { initialElapsed: 45 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '생각보다 오래 걸리고 있어요'
    );
  },
};

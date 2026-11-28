import { expect, within } from 'storybook/test';

import { TasteAnalysisLoading } from './TasteAnalysisLoading';

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'Features/TasteAnalysis/취향 분석 중',
  component: TasteAnalysisLoading,
  args: { progress: 0.05 },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TasteAnalysisLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 막 시작 — 책등 한 권, 첫 문구 */
export const 시작: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '책장을 꺼내 오고 있어요'
    );
  },
};

/** 추천 책을 고르는 중 — 책장이 절반 차고 결이 맞는 책이 켜진다 */
export const 중간: Story = {
  args: { progress: 0.55 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '다음에 읽을 책을 고르고 있어요'
    );
  },
};

/** 응답이 늦을 때 — 진행률과 상관없이 안내 문구가 바뀐다 */
export const 늦어질때: Story = {
  args: { progress: 0.6, initialElapsed: 45 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '생각보다 오래 걸리고 있어요'
    );
  },
};

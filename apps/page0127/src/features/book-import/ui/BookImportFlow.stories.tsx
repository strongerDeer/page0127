import { expect, userEvent, within } from 'storybook/test';

import { apiClient } from '@/shared/api/client';

import { BookImportFlow } from './BookImportFlow';

import type { MatchResponse } from '../model/types';
import type { ProviderBook } from '@/entities/book';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { AxiosAdapter } from 'axios';

const book = (
  isbn: string,
  title: string,
  author: string,
  publisher = '출판사'
): ProviderBook => ({
  isbn,
  title,
  subTitle: null,
  author,
  publisher,
  pubDate: null,
  description: '',
  category: '',
  coverImage: '',
  spineImage: null,
  backImage: null,
  page: null,
  toc: null,
  dimensions: null,
  source: 'yes24',
  providerItemId: null,
  providerLink: '',
});

// 붙여넣을 표 4줄에 대한 가짜 매칭 결과 — 찾음 / 골라야 함 / 이미 서재에 / 못 찾음
const MATCH: MatchResponse = {
  results: [
    {
      candidates: [
        book('9788934985068', '팩트풀니스', '한스 로슬링', '김영사'),
      ],
      picked: 0,
    },
    {
      candidates: [
        book('9791161571188', '불편한 편의점', '김호연', '나무옆의자'),
        book('9791161571652', '불편한 편의점 2', '김호연', '나무옆의자'),
      ],
      picked: null,
    },
    {
      candidates: [book('9788937460449', '데미안', '헤르만 헤세', '민음사')],
      picked: 0,
    },
    { candidates: [], picked: null },
  ],
  existing: { isbns: ['9788937460449'], providerItemIds: [] },
};

const mockAdapter: AxiosAdapter = async (config) => ({
  data: config.url?.endsWith('/match')
    ? MATCH
    : { added: 2, skipped: 0, failed: 0 },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const meta = {
  title: 'Features/Book/여러 권 한 번에 담기',
  component: BookImportFlow,
  // useRouter(next/navigation) 를 쓴다 — 앱 라우터 목을 켠다
  parameters: { nextjs: { appDirectory: true } },
  // 스토리를 떠나면 원래 어댑터로 되돌린다 — 다른 스토리의 요청까지 가짜 응답을 받지 않게
  beforeEach: () => {
    const original = apiClient.defaults.adapter;
    apiClient.defaults.adapter = mockAdapter;
    return () => {
      apiClient.defaults.adapter = original;
    };
  },
} satisfies Meta<typeof BookImportFlow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Input: Story = {};

/** 붙여넣고 "찾기"를 누른 뒤의 확인 화면 */
export const Review: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByLabelText('책 목록');
    await userEvent.click(textarea);
    await userEvent.paste(
      '제목\t저자\n팩트풀니스\t한스 로슬링\n불편한 편의점\t김호연\n데미안\t헤르만 헤세\n없는 책 제목\t누구'
    );
    await userEvent.click(canvas.getByRole('button', { name: '4권 찾기' }));

    await expect(
      await canvas.findByText('4권 중 1권을 찾았어요')
    ).toBeInTheDocument();
    await expect(
      canvas.getByText('어떤 책인지 골라 주세요')
    ).toBeInTheDocument();
    await expect(canvas.getByText('이미 서재에 있어요')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: '1권 서재에 담기' })
    ).toBeEnabled();
  },
};

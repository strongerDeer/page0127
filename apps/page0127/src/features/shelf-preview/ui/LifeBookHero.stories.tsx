import { LifeBookHero } from './LifeBookHero';

import type { LeaderLifeBook } from '../model/leaderLifeBooks';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

// 표지 주소는 비워 둔다 — 스토리북에서 외부 이미지를 부르지 않고, 표지가 없을 때 제목 대체를 같이 본다
const leader = (isbn: string, title: string): LeaderLifeBook => ({
  isbn,
  title,
  coverSrc: null,
  coverFallback: null,
});

const LEADERS = [
  leader(
    '1',
    '데이터 삽질 끝에 UX가 보였다 - 스타트업 전문 프로덕트 디자이너가 들려주는 현실 데이터 드리븐'
  ),
  leader('2', '사랑의 생애'),
  leader('3', '피로사회'),
  leader('4', '당신 인생의 이야기'),
  leader('5', '사고외주'),
];

/** 비로그인 홈 히어로 B(인생책 찾기). 가운데 정렬 — 2026-11-01 */
const meta = {
  title: 'Features/ShelfPreview/LifeBookHero',
  component: LifeBookHero,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  args: { leaders: LEADERS },
} satisfies Meta<typeof LifeBookHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { name: '처음 (리더 인생책 있음)' };

/** 리더 인생책이 아직 없으면 그 줄은 그리지 않는다 */
export const NoLeaders: Story = {
  name: '리더 인생책 없음',
  args: { leaders: [] },
};

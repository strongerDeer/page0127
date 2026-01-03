'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { CategoryDistribution } from '@/entities/book/types/stats';

type Props = {
  data: CategoryDistribution[];
  onCategoryClick?: (category: string) => void;
};

// 차트 색상 (Tailwind 기본 팔레트)
const COLORS = [
  '#10B981', // emerald-500
  '#3B82F6', // blue-500
  '#8B5CF6', // purple-500
  '#F59E0B', // amber-500
  '#EC4899', // pink-500
  '#6B7280', // gray-500 (기타)
];

/**
 * 카테고리별 분포 파이 차트
 *
 * 학습 포인트:
 * - Recharts PieChart 사용
 * - Top 5 카테고리 + 기타
 * - 클릭 시 카테고리 필터 적용 (선택 사항)
 * - 비율과 권수 함께 표시
 *
 * @param data - 카테고리별 분포 데이터
 * @param onCategoryClick - 카테고리 클릭 핸들러 (선택 사항)
 */
export const CategoryPieChart = ({ data, onCategoryClick }: Props) => {
  // 데이터가 없으면 빈 상태 표시
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-gray-500">
        <p>데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(entry: unknown) => {
            const e = entry as { category: string; percentage: number };
            return `${e.category} ${e.percentage}%`;
          }}
          onClick={(entry: unknown) => {
            const e = entry as { category: string };
            return onCategoryClick?.(e.category);
          }}
          style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
        >
          {data.map((entry, index) => (
            <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, props: unknown) => {
            const p = props as { payload?: { percentage: number } };
            return [
              `${value}권 (${p.payload?.percentage ?? 0}%)`,
              name,
            ];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

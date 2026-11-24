import { adminInk } from '@/shared/lib/admin/adminChartColors';

type SparklineProps = {
  values: number[];
  /** 접근성용 한 줄 (예: '최근 14일 DAU') */
  label: string;
  color?: string;
};

const W = 120;
const H = 28;
const PAD = 3;

/**
 * 숫자 카드 안 작은 추세선 — 축·눈금 없이 "오르나 내리나"만 본다.
 * 마지막 점(어제)을 동그라미로 찍어 끝이 어디인지 보이게 한다.
 * 값이 모두 같으면 가운데 수평선(0 으로 나누기 방지).
 */
export const Sparkline = ({
  values,
  label,
  color = adminInk.primary,
}: SparklineProps) => {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = span === 0 ? H / 2 : PAD + (1 - (v - min) / span) * (H - PAD * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className='mt-2 h-auto w-full max-w-40'
      role='img'
      aria-label={`${label}: ${values.join(', ')}`}
    >
      <polygon
        points={`${PAD},${H} ${line} ${W - PAD},${H}`}
        fill={color}
        fillOpacity={0.12}
      />
      <polyline
        points={line}
        fill='none'
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin='round'
      />
      <circle cx={lx} cy={ly} r={2.6} fill={color} />
    </svg>
  );
};

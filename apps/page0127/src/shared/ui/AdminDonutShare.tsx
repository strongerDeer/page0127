import { buildDonutSlices, type DonutInput } from '@/shared/lib/admin/donutSlices';

type DonutShareProps = {
  title: string;
  caption?: string;
  items: DonutInput[];
  /** 도넛 가운데 큰 숫자 아래 한 단어 (예: '세션', '명') */
  centerLabel: string;
  /** 가운데 숫자 — 없으면 items 합계 */
  centerValue?: number;
  maxSlices?: number;
  emptyText?: string;
};

const R = 42;
const STROKE = 16;
const C = 2 * Math.PI * R;

/**
 * "전체 중 몇 %"를 보는 도넛 + 범례 (HJ, 2026-11-24).
 *
 * recharts 없이 SVG 원 하나에 stroke-dasharray 로 조각을 그린다 — 서버에서 그려져
 * 자바스크립트가 필요 없고, 조각 길이 = 비율 × 둘레라 계산이 정직하다.
 * 범례는 HTML 이라 긴 이름도 줄바꿈되고 스크린 리더가 그대로 읽는다(SVG 는 aria-hidden).
 */
export const DonutShare = ({
  title,
  caption,
  items,
  centerLabel,
  centerValue,
  maxSlices = 4,
  emptyText = '데이터 없음',
}: DonutShareProps) => {
  const slices = buildDonutSlices(items, maxSlices);
  const total = centerValue ?? items.reduce((a, i) => a + i.value, 0);

  return (
    <div className='rounded-lg border border-line p-4'>
      <div className='text-sm font-medium'>{title}</div>
      {caption && <p className='mt-0.5 text-xs text-text-subtle'>{caption}</p>}
      {slices.length === 0 ? (
        <p className='mt-3 text-xs text-text-subtle'>{emptyText}</p>
      ) : (
        <div className='mt-3 flex flex-wrap items-center gap-x-6 gap-y-3'>
          <div className='relative h-28 w-28 shrink-0'>
            <svg viewBox='0 0 100 100' className='h-full w-full' aria-hidden>
              {/* 12시 방향에서 시계 방향으로 */}
              <g transform='rotate(-90 50 50)' fill='none' strokeWidth={STROKE}>
                {slices.map((s) => (
                  <circle
                    key={s.key}
                    cx={50}
                    cy={50}
                    r={R}
                    stroke={s.color}
                    // 조각 사이 1px 틈 — 같은 계열 색이 붙어도 경계가 보이게
                    strokeDasharray={`${Math.max(s.share * C - (slices.length > 1 ? 1 : 0), 0.5)} ${C}`}
                    strokeDashoffset={-s.start * C}
                  />
                ))}
              </g>
            </svg>
            <div className='absolute inset-0 flex flex-col items-center justify-center'>
              <span className='text-lg font-bold tabular-nums text-text-strong'>
                {total.toLocaleString('ko-KR')}
              </span>
              <span className='text-[11px] text-text-subtle'>{centerLabel}</span>
            </div>
          </div>
          <ul className='flex min-w-0 flex-1 flex-col gap-1.5 text-xs'>
            {slices.map((s) => (
              <li key={s.key} className='flex items-center gap-2'>
                <span
                  aria-hidden
                  className='h-2.5 w-2.5 shrink-0 rounded-sm'
                  style={{ backgroundColor: s.color }}
                />
                <span className='min-w-0 flex-1 truncate' title={s.hint ? `${s.label} — ${s.hint}` : s.label}>
                  {s.label}
                </span>
                <span className='shrink-0 tabular-nums text-text-subtle'>
                  {s.display ?? s.value.toLocaleString('ko-KR')}
                  <span className='ml-1.5 font-medium text-text-strong'>
                    {Math.round(s.share * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

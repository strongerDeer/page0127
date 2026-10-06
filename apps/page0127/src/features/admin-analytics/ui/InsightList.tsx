import type { Insight } from '../lib/insights';

type InsightListProps = { insights: Insight[] };

// 색만으로 구분하지 않게 아이콘 + 글자 라벨을 같이 붙인다
const TONE: Record<
  Insight['tone'],
  { icon: string; label: string; cls: string }
> = {
  warn: { icon: '!', label: '확인 필요', cls: 'bg-amber-100 text-amber-800' },
  good: { icon: '✓', label: '좋음', cls: 'bg-emerald-100 text-emerald-800' },
  info: { icon: 'i', label: '참고', cls: 'bg-line/60 text-text-subtle' },
};

/** 화면 맨 위 "그래서 뭘 하나" — 숫자를 읽기 전에 결론부터 */
export const InsightList = ({ insights }: InsightListProps) => (
  <div className='rounded-lg border border-line p-4'>
    <div className='mb-3 text-sm font-medium'>이번 28일, 볼 것</div>
    <ul className='flex flex-col gap-3'>
      {insights.map((insight) => {
        const tone = TONE[insight.tone];
        return (
          <li key={insight.title} className='flex gap-3 text-sm'>
            <span
              className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${tone.cls}`}
            >
              <span aria-hidden>{tone.icon}</span> {tone.label}
            </span>
            <div>
              <p className='font-medium'>{insight.title}</p>
              <p className='mt-0.5 text-xs text-text-subtle'>
                → {insight.action}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

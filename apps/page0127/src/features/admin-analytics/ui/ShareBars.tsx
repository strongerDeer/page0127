import { chartInk } from '@/shared/lib/chartStyles';

export type ShareBarItem = {
  key: string;
  label: string;
  /** 라벨 아래 작은 풀이 (채널 설명 등) */
  sub?: string;
  /** 막대 길이를 정하는 값 */
  value: number;
  /** 오른쪽에 찍을 문구 — 없으면 value 와 전체 대비 비율 */
  display?: string;
  /** 라벨 옆 표시 (예: '데이터센터 추정') */
  badge?: string;
};

type ShareBarsProps = {
  title: string;
  /** 이 카드가 답하는 질문/읽는 법 한 줄 */
  caption?: string;
  items: ShareBarItem[];
  emptyText?: string;
};

/**
 * 가로 막대 목록 — "어느 것이 얼마나 큰가"를 한눈에.
 *
 * recharts 대신 HTML 로 그린 이유: 항목 이름이 길고(페이지 경로·채널 풀이) 줄바꿈이 필요한데,
 * SVG 축 라벨은 줄바꿈이 안 된다. HTML 이면 글자가 그대로 읽히고(스크린리더·복사) 폭에 맞게 접힌다.
 * 막대는 단일 계열이라 색 하나(그린)만 쓴다 — 색이 아니라 길이가 정보다.
 */
export const ShareBars = ({
  title,
  caption,
  items,
  emptyText = '데이터 없음',
}: ShareBarsProps) => {
  const max = Math.max(0, ...items.map((i) => i.value));
  const total = items.reduce((a, i) => a + i.value, 0);

  return (
    <div className='rounded-lg border border-line p-4'>
      <div className='text-sm font-medium'>{title}</div>
      {caption && <p className='mt-0.5 text-xs text-text-subtle'>{caption}</p>}
      {items.length === 0 ? (
        <p className='mt-3 text-xs text-text-subtle'>{emptyText}</p>
      ) : (
        <ul className='mt-3 flex flex-col gap-2.5'>
          {items.map((item) => {
            const share = total > 0 ? item.value / total : 0;
            return (
              <li key={item.key} className='text-xs'>
                <div className='flex items-baseline justify-between gap-3'>
                  <span className='min-w-0 truncate' title={item.label}>
                    {item.label}
                    {item.badge && (
                      <span className='ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800'>
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className='shrink-0 tabular-nums text-text-subtle'>
                    {item.display ??
                      `${item.value.toLocaleString('ko-KR')} · ${Math.round(share * 100)}%`}
                  </span>
                </div>
                {/* 막대 — 가장 큰 항목을 100% 로 맞춰 차이가 잘 보이게 한다 */}
                <div className='mt-1 h-1.5 rounded-full bg-line/50'>
                  <div
                    className='h-1.5 rounded-full'
                    style={{
                      width: `${max > 0 ? (item.value / max) * 100 : 0}%`,
                      // bg-primary 는 앱 버튼 색(블루)이라 차트 공용 그린과 어긋난다 — 같은 색 상수를 쓴다
                      backgroundColor: chartInk.primary,
                    }}
                  />
                </div>
                {item.sub && (
                  <p className='mt-0.5 text-[11px] text-text-subtle'>
                    {item.sub}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

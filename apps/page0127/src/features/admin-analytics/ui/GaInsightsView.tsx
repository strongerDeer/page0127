import {
  CHANNELS,
  formatMetric,
  type ReportKey,
  REPORTS,
  type ReportTable,
} from '../lib/ga4Reports';
import {
  buildHeadline,
  buildInsights,
  fillDaily,
  isDatacenterCity,
  type Reports,
  weekOverWeek,
} from '../lib/insights';
import { DailyUsersChart } from './DailyUsersChart';
import { InsightList } from './InsightList';
import { ReportTableCard } from './ReportTableCard';
import { type ShareBarItem, ShareBars } from './ShareBars';

import type { ReactNode } from 'react';

type GaInsightsViewProps = { reports: Reports; now: Date };

const defOf = (key: ReportKey) => {
  const def = REPORTS.find((r) => r.key === key);
  if (!def) throw new Error(`정의되지 않은 GA 보고서: ${key}`);
  return def;
};

/** 첫 측정항목을 막대 값으로 쓰는 기본 변환 */
const toBars = (t: ReportTable): ShareBarItem[] =>
  t.rows.map((r) => ({
    key: r.raw.join('|'),
    label: r.labels.join(' · '),
    value: r.values[0],
  }));

/**
 * 유입분석 본문 — 표 14장 대신 **질문 4개**로 묶는다.
 * 결론(볼 것) → 핵심 숫자 → 질문별 차트 → 세부 표(접힘) 순서. 숫자를 읽기 전에 결론부터 본다.
 */
export const GaInsightsView = ({ reports, now }: GaInsightsViewProps) => {
  const daily = fillDaily(reports.daily, now);
  const wow = weekOverWeek(daily);
  const h = buildHeadline(reports);
  const summary = reports.summary.rows[0]?.values ?? [];

  const tiles = [
    {
      label: '사용자',
      value: formatMetric(h.users, 'int'),
      hint: '28일 동안 들어온 사람 수',
    },
    {
      label: '한국에서',
      value: formatMetric(h.domesticShare, 'percent'),
      hint: '나머지는 해외·데이터센터',
    },
    {
      label: '검색으로',
      value: formatMetric(h.searchShare, 'percent'),
      hint: '구글·네이버 검색을 타고 온 방문',
    },
    {
      label: '모바일',
      value: formatMetric(h.mobileShare, 'percent'),
      hint: '휴대폰·태블릿 사용자',
    },
    {
      label: '참여율',
      value: formatMetric(summary[3] ?? 0, 'percent'),
      hint: '10초 이상 머물거나 2쪽 이상 본 방문',
    },
  ];

  return (
    <>
      <InsightList insights={buildInsights(reports, daily)} />

      <dl className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
        {tiles.map((t) => (
          <div key={t.label} className='rounded-lg border border-line p-3'>
            <dt className='text-xs text-text-subtle'>{t.label}</dt>
            <dd className='mt-1 text-lg font-medium tabular-nums'>{t.value}</dd>
            <dd className='mt-0.5 text-[11px] text-text-subtle'>{t.hint}</dd>
          </div>
        ))}
      </dl>

      <Section title='사람이 늘고 있나?' cols={1}>
        <DailyUsersChart points={daily} weekOverWeek={wow} />
      </Section>

      <Section title='어디서 오나?'>
        <ShareBars
          title='들어온 길 (채널)'
          caption='세션 기준. GA 가 방문마다 어떤 길로 왔는지 자동으로 분류한 것'
          items={reports.channel.rows.map((r) => ({
            key: r.raw[0],
            label: r.labels[0],
            sub: CHANNELS[r.raw[0]]?.desc,
            value: r.values[0],
          }))}
        />
        <ReportTableCard
          def={defOf('sourceMedium')}
          table={reports.sourceMedium}
        />
      </Section>

      <Section title='어디서 접속하나?'>
        <ShareBars
          title='국가'
          caption='IP 주소로 추정한 위치'
          items={toBars(reports.country)}
        />
        <ShareBars
          title='도시'
          caption='데이터센터 표시는 사람이 아니라 서버(봇·측정 도구)일 가능성이 큰 곳'
          items={reports.city.rows.map((r) => ({
            key: r.raw.join('|'),
            label: r.labels.join(' · '),
            value: r.values[0],
            badge: isDatacenterCity(r.raw[0]) ? '데이터센터 추정' : undefined,
          }))}
        />
      </Section>

      <Section title='어디서 머물고, 어디서 떠나나?'>
        <ShareBars
          title='많이 본 페이지'
          caption='페이지뷰 기준'
          items={toBars(reports.pages)}
        />
        <ShareBars
          title='첫 페이지별 이탈률'
          caption='그 페이지로 들어와 아무것도 안 하고 떠난 비율. 막대가 길수록 손볼 곳'
          items={reports.landingBounce.rows.map((r) => ({
            key: r.raw[0],
            label: r.labels[0],
            value: r.values[1],
            display: `${formatMetric(r.values[1], 'percent')} · ${r.values[0]}세션`,
            // 4세션 중 4명이 떠나도 100% 다 — 해석 규칙과 같은 10세션 기준으로 경고한다
            badge: r.values[0] < 10 ? '표본 적음' : undefined,
          }))}
        />
      </Section>

      <Section title='어떤 환경에서 보나?'>
        <ShareBars title='기기' items={toBars(reports.device)} />
        <ShareBars
          title='요일'
          caption='어느 요일에 알림·글을 올리면 좋을지 판단할 때'
          items={toBars(reports.dayOfWeek)}
        />
      </Section>

      <details className='rounded-lg border border-line p-4'>
        <summary className='cursor-pointer text-sm font-medium'>
          세부 표 — 브라우저 · OS · 해상도 · 성별 · 연령
        </summary>
        <div className='mt-3 grid gap-3 sm:grid-cols-2'>
          {(['browser', 'os', 'resolution', 'gender', 'age'] as const).map(
            (key) => (
              <ReportTableCard
                key={key}
                def={defOf(key)}
                table={reports[key]}
              />
            )
          )}
        </div>
      </details>
    </>
  );
};

type SectionProps = { title: string; cols?: 1 | 2; children: ReactNode };

export const Section = ({ title, cols = 2, children }: SectionProps) => (
  <div>
    <h2 className='mb-2 text-sm font-medium'>{title}</h2>
    <div className={cols === 2 ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
      {children}
    </div>
  </div>
);

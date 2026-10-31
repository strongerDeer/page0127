import {
  changeRate,
  type DateRange,
  shortDate,
} from '@/shared/lib/admin/dateRange';

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
  weekdayAverages,
  weekOverWeek,
} from '../lib/insights';
import { DailyUsersChart } from './DailyUsersChart';
import { InsightList } from './InsightList';
import { ReportTableCard } from './ReportTableCard';
import { type ShareBarItem, ShareBars } from './ShareBars';

import type { AdminEvent } from '@/features/admin-events/api/getAdminEvents';
import type { ReactNode } from 'react';

type GaInsightsViewProps = {
  reports: Reports;
  range: DateRange;
  /** 바로 앞 같은 길이 기간의 요약 — 타일 증감 */
  previousSummary: ReportTable;
  /** 운영 기록 — 일별 차트에 세로선으로 찍는다 */
  events?: AdminEvent[];
};

/** 증감 표기 — 비율 지표는 %p(포인트), 개수는 % */
const changeText = (
  cur: number,
  prev: number,
  kind: 'count' | 'ratio'
): string | undefined => {
  if (kind === 'ratio') {
    if (prev === 0 && cur === 0) return undefined;
    const p = Math.round((cur - prev) * 1000) / 10;
    return `앞 기간 대비 ${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p)}%p`;
  }
  const r = changeRate(cur, prev);
  if (r === null) return undefined;
  const p = Math.round(r * 100);
  return `앞 기간 대비 ${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p)}%`;
};

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
 * 결론(볼 것) → 핵심 숫자 → 질문별 차트 → 세부 표 순서. 숫자를 읽기 전에 결론부터 본다.
 */
export const GaInsightsView = ({
  reports,
  range,
  previousSummary,
  events = [],
}: GaInsightsViewProps) => {
  // 추이·증감 해석은 "사람 추정(한국)" 선으로 한다 — 전체 선은 봇이 하루 수십 명씩 끼어 출렁인다
  const allDaily = fillDaily(reports.daily, range);
  const daily = fillDaily(reports.humanDaily, range);
  const chartPoints = daily.map((p, i) => ({
    ...p,
    all: allDaily[i]?.users ?? 0,
  }));
  // 증감·요일 평균은 끝난 날만으로 센다 — 오늘(집계 중)을 넣으면 마지막 7일·그 요일이 낮게 나온다
  const completeDaily = range.includesToday ? daily.slice(0, -1) : daily;
  const wow = weekOverWeek(completeDaily);
  const weekdays = weekdayAverages(completeDaily);
  const h = buildHeadline(reports);
  // 오늘이 섞이면 반나절을 꽉 찬 앞 기간과 견주게 된다 — 타일 증감을 숨긴다
  const change = (cur: number, prev: number, kind: 'count' | 'ratio') =>
    range.includesToday ? undefined : changeText(cur, prev, kind);
  const summary = reports.summary.rows[0]?.values ?? [];
  const prev = previousSummary.rows[0]?.values ?? [];
  const human = reports.humanSummary.rows[0]?.values ?? [];
  const humanUsers = human[0] ?? 0;

  const tiles = [
    {
      label: '사람 추정 사용자',
      value: formatMetric(humanUsers, 'int'),
      hint: '한국에서 온 방문 · 해외·데이터센터 봇 제외',
    },
    {
      label: 'GA 전체 사용자',
      value: formatMetric(h.users, 'int'),
      hint:
        h.users > 0
          ? `봇 포함 · 이 중 ${formatMetric(1 - humanUsers / h.users, 'percent')}가 해외`
          : '봇 포함',
      change: change(h.users, prev[0] ?? 0, 'count'),
    },
    {
      label: '페이지뷰',
      value: formatMetric(human[2] ?? 0, 'int'),
      hint: `사람 추정 기준 · 전체 ${formatMetric(summary[2] ?? 0, 'int')}`,
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
      change: change(summary[3] ?? 0, prev[3] ?? 0, 'ratio'),
    },
  ];

  return (
    <>
      <InsightList
        insights={buildInsights(reports, completeDaily, range.label)}
      />

      <p className='text-xs text-text-subtle'>
        이 화면은 GA4 기준이라 로그인하지 않은 방문까지 셉니다. 회원만 센
        DAU·MAU 는 어드민 홈에 있어요.
      </p>

      <dl className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
        {tiles.map((t) => (
          <div key={t.label} className='rounded-lg border border-line p-3'>
            <dt className='text-xs text-text-subtle'>{t.label}</dt>
            <dd className='mt-1 text-lg font-medium tabular-nums'>{t.value}</dd>
            <dd className='mt-0.5 text-[11px] text-text-subtle'>{t.hint}</dd>
            {'change' in t && t.change && (
              <dd className='mt-0.5 text-[11px] font-medium text-text-strong'>
                {t.change}
              </dd>
            )}
          </div>
        ))}
      </dl>

      <Section title='사람이 늘고 있나?' cols={1}>
        <DailyUsersChart
          points={chartPoints}
          weekOverWeek={wow}
          markers={events.map((e) => ({
            label: shortDate(e.date),
            title: e.title,
          }))}
        />
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

      <Section title='공유가 사람을 데려오나?' cols={1}>
        <ShareBars
          title='공유 링크로 들어온 방문'
          caption='세션 기준. 받은 사람이 카톡·인스타 앱 안에서 열면 앱 이름이, 사파리·크롬으로 열면 "앱 모름"으로 잡힙니다. 이미지(스토리) 공유는 링크가 없어 여기 안 잡혀요.'
          items={reports.shares.rows.map((r) => ({
            key: r.raw.join('|'),
            label: r.labels.join(' · '),
            value: r.values[0],
            display: `${r.values[0]}세션 · ${r.values[1]}명`,
          }))}
        />
      </Section>

      <Section title='홈 화면 앱으로 쓰나?' cols={1}>
        <AppUsageTiles table={reports.appUsage} />
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
          caption='사람 추정 기준 하루 평균. 기간에 요일마다 든 날 수가 달라 합계 대신 평균으로 견줍니다(오늘은 집계 중이라 뺌)'
          items={weekdays.map((w) => ({
            key: String(w.day),
            label: w.label,
            value: w.avg,
            display: `평균 ${w.avg.toFixed(1)}명 · ${w.count}일`,
          }))}
          emptyText='끝난 날이 없어 아직 요일 평균을 낼 수 없어요'
        />
      </Section>

      {/* 세부 표 — 접어 두면 열어 보지 않게 돼서 다른 질문들처럼 늘 펼쳐 둔다 (2026-10-31) */}
      <Section title='세부 표 — 브라우저 · OS · 해상도 · 성별 · 연령'>
        {(['browser', 'os', 'resolution', 'gender', 'age'] as const).map(
          (key) => (
            <ReportTableCard key={key} def={defOf(key)} table={reports[key]} />
          )
        )}
      </Section>
    </>
  );
};

/** 이벤트 이름 → [횟수, 사용자]. 없으면 0 */
const eventValues = (t: ReportTable, name: string): [number, number] => {
  const row = t.rows.find((r) => r.raw[0] === name);
  return [row?.values[0] ?? 0, row?.values[1] ?? 0];
};

const AppUsageTiles = ({ table }: { table: ReportTable }) => {
  const [opens, openUsers] = eventValues(table, 'app_open');
  const [installs] = eventValues(table, 'app_install');
  const tiles = [
    {
      label: '앱으로 연 사람',
      value: `${openUsers.toLocaleString('ko-KR')}명`,
      hint: `홈 화면 아이콘으로 연 방문 ${opens.toLocaleString('ko-KR')}번 (세션 기준)`,
    },
    {
      label: '새로 설치',
      value: `${installs.toLocaleString('ko-KR')}번`,
      hint: '안드로이드·PC 크롬만 알려 줘요. 아이폰 설치는 위 "앱으로 연 사람"으로 봅니다',
    },
  ];
  return (
    <dl className='grid gap-3 sm:grid-cols-2'>
      {tiles.map((t) => (
        <div key={t.label} className='rounded-lg border border-line p-3'>
          <dt className='text-xs text-text-subtle'>{t.label}</dt>
          <dd className='mt-1 text-lg font-medium tabular-nums'>{t.value}</dd>
          <dd className='mt-0.5 text-[11px] text-text-subtle'>{t.hint}</dd>
        </div>
      ))}
    </dl>
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

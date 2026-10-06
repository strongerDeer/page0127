import { toKstDateKey } from '@/shared/lib/date';

import type { ReportKey, ReportTable } from './ga4Reports';

/**
 * GA 숫자 → "그래서 뭘 하라는 건지" 한 줄씩.
 *
 * 표만 보여 주면 읽는 사람이 매번 해석해야 하고, 결국 안 보게 된다.
 * 규칙을 코드로 박아 두면 같은 기준으로 매번 판정하고, 기준 자체를 리뷰할 수 있다.
 * 기준값(임곗값)은 업계 통계가 아니라 "이 정도면 손댈 만하다"는 운영 판단이다.
 */

export type Reports = Record<ReportKey, ReportTable>;

export type Insight = {
  tone: 'good' | 'warn' | 'info';
  /** 무슨 일이 있나 — 숫자를 포함한 한 줄 */
  title: string;
  /** 그래서 뭘 하나 */
  action: string;
};

/**
 * 데이터센터가 몰린 도시 — 여기서 온 "사람"은 대부분 서버(봇·측정 도구)다.
 * GA4 는 봇 여부를 차원으로 주지 않아 도시 이름으로 추정한다(확정이 아니라 추정).
 * Boardman·The Dalles 는 오리건(AWS·구글), Ashburn 은 버지니아(AWS 최대 리전),
 * Council Bluffs 는 아이오와(구글).
 * Des Moines 는 아이오와(마이크로소프트 Azure Central US) — GitHub Actions 러너가 Azure 라
 * 매주 품질 측정(Lighthouse)이 여기서 잡힌다. Flint Hill 은 버지니아의 작은 마을인데 GA 봇
 * 트래픽 위치로 흔히 보고된다. 둘 다 2026-10-06 유입분석에서 사용자 28%·19% 로 처음 확인.
 */
const DATACENTER_CITIES = new Set([
  'Boardman',
  'The Dalles',
  'Ashburn',
  'Council Bluffs',
  'Des Moines',
  'Flint Hill',
  'Moses Lake',
  'Quincy',
  'Prineville',
]);

export const isDatacenterCity = (city: string): boolean =>
  DATACENTER_CITIES.has(city);

/** 이 아래면 비율 해석이 무의미하다 — 3명 중 1명이 해외면 33% 가 된다 */
export const MIN_USERS_FOR_INSIGHT = 10;

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const pct = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** 보고서의 첫 측정항목 합 */
const total = (t: ReportTable): number => sum(t.rows.map((r) => r.values[0]));

/** raw 첫 값이 key 인 행들의 첫 측정항목 합 / 전체 */
const shareOf = (t: ReportTable, keys: string[]): number => {
  const all = total(t);
  if (all === 0) return 0;
  return (
    sum(t.rows.filter((r) => keys.includes(r.raw[0])).map((r) => r.values[0])) /
    all
  );
};

export type Headline = {
  users: number;
  /** 한국에서 온 사용자 비율 */
  domesticShare: number;
  /** 세션 중 검색으로 들어온 비율 */
  searchShare: number;
  /** 사용자 중 모바일 비율 */
  mobileShare: number;
  /** 도시 상위 목록 중 데이터센터 추정 도시의 사용자 비율 */
  datacenterShare: number;
};

export const buildHeadline = (r: Reports): Headline => {
  const users = r.summary.rows[0]?.values[0] ?? 0;
  const cityTotal = total(r.city);
  return {
    users,
    domesticShare: shareOf(r.country, ['KR']),
    searchShare: shareOf(r.channel, ['Organic Search', 'Paid Search']),
    mobileShare: shareOf(r.device, ['mobile', 'tablet']),
    datacenterShare:
      cityTotal === 0
        ? 0
        : sum(
            r.city.rows
              .filter((row) => isDatacenterCity(row.raw[0]))
              .map((row) => row.values[0])
          ) / cityTotal,
  };
};

export type DailyPoint = { date: string; label: string; users: number };

/**
 * GA 는 사용자가 0명인 날을 **행으로 안 준다**. 그대로 그리면 빈 날이 사라져 선이
 * 이어 붙고 추이가 왜곡된다 — 기간 전체 날짜를 깔고 없는 날은 0 으로 채운다.
 * GA 속성 시간대가 KST 라는 전제(page0127 속성 설정)로 KST 날짜를 쓴다.
 */
export const fillDaily = (
  t: ReportTable,
  now: Date,
  days = 28
): DailyPoint[] => {
  const byDate = new Map(t.rows.map((r) => [r.raw[0], r.values[0]]));
  const points: DailyPoint[] = [];
  // 어제부터 days 일 전까지 (오늘은 집계 중이라 GA_DATE_RANGE 와 같이 뺀다)
  for (let i = days; i >= 1; i--) {
    const key = toKstDateKey(new Date(now.getTime() - i * 86_400_000));
    const date = key.replaceAll('-', '');
    points.push({
      date,
      label: `${key.slice(5, 7)}/${key.slice(8, 10)}`,
      users: byDate.get(date) ?? 0,
    });
  }
  return points;
};

/** 최근 7일 평균 / 그 전 7일 평균 - 1. 앞 주가 0 이면 비교 불가(null) */
export const weekOverWeek = (points: DailyPoint[]): number | null => {
  if (points.length < 14) return null;
  const last = sum(points.slice(-7).map((p) => p.users));
  const prev = sum(points.slice(-14, -7).map((p) => p.users));
  return prev === 0 ? null : last / prev - 1;
};

export const buildInsights = (r: Reports, daily: DailyPoint[]): Insight[] => {
  const h = buildHeadline(r);

  if (h.users < MIN_USERS_FOR_INSIGHT) {
    return [
      {
        tone: 'info',
        title: `최근 28일 사용자 ${h.users}명 — 아직 비율을 해석하기엔 적습니다`,
        action: `${MIN_USERS_FOR_INSIGHT}명이 넘으면 유입 경로·이탈 해석을 보여 드립니다. 지금은 아래 표의 개별 숫자만 참고하세요.`,
      },
    ];
  }

  const out: Insight[] = [];

  const wow = weekOverWeek(daily);
  if (wow !== null && Math.abs(wow) >= 0.2) {
    out.push(
      wow > 0
        ? {
            tone: 'good',
            title: `지난주보다 방문이 ${pct(wow)} 늘었습니다`,
            action:
              '무엇이 효과였는지(공유·글·기능 출시) 기록해 두면 다음에 반복할 수 있습니다.',
          }
        : {
            tone: 'warn',
            title: `지난주보다 방문이 ${pct(-wow)} 줄었습니다`,
            action:
              '배포로 막힌 화면이 없는지(에러 탭), 유입 채널 중 어느 쪽이 줄었는지 먼저 봅니다.',
          }
    );
  }

  const unassigned = shareOf(r.channel, ['Unassigned']);
  if (h.datacenterShare >= 0.2 || unassigned >= 0.2) {
    out.push({
      tone: 'warn',
      title: `사람이 아닌 방문이 섞인 것으로 보입니다 (데이터센터 도시 ${pct(h.datacenterShare)}, 분류 안 됨 ${pct(unassigned)})`,
      action:
        '매주 도는 품질 측정(Lighthouse)이 GA 로 방문을 보내지 않게 막으면 아래 숫자가 실제 사람만 남습니다.',
    });
  }

  if (h.searchShare < 0.1) {
    out.push({
      tone: 'warn',
      title: `검색으로 들어온 방문이 ${pct(h.searchShare)}뿐입니다`,
      action:
        'Search Console 의 페이지 색인 현황과 사이트맵 제출 상태를 확인하고, 책 상세 페이지 제목·설명이 검색어와 맞는지 봅니다.',
    });
  } else if (h.searchShare >= 0.3) {
    out.push({
      tone: 'good',
      title: `방문의 ${pct(h.searchShare)}가 검색에서 옵니다`,
      action:
        '아래 검색어 표에서 노출은 많은데 클릭률이 낮은 검색어의 페이지 제목을 다듬으면 더 늘릴 수 있습니다.',
    });
  }

  const direct = shareOf(r.channel, ['Direct']);
  if (direct >= 0.6) {
    out.push({
      tone: 'info',
      title: `방문의 ${pct(direct)}가 '직접 방문'입니다 — 어디서 왔는지 모르는 방문입니다`,
      action:
        '카톡·인스타에 링크를 올릴 때 끝에 ?utm_source=kakao 처럼 꼬리표를 붙이면 다음부터 출처별로 나뉩니다.',
    });
  }

  // 표본 10세션 이상인 첫 페이지 중 이탈률이 가장 높은 곳 하나만 짚는다
  const worstLanding = r.landingBounce.rows
    .filter((row) => row.values[0] >= 10 && row.values[1] >= 0.6)
    .sort((a, b) => b.values[1] - a.values[1])[0];
  if (worstLanding) {
    out.push({
      tone: 'warn',
      title: `${worstLanding.labels[0]} 로 들어온 사람의 ${pct(worstLanding.values[1])}가 바로 떠났습니다`,
      action:
        '그 페이지 첫 화면에서 다음에 할 일(가입·책 둘러보기)이 바로 보이는지 확인합니다.',
    });
  }

  if (h.mobileShare >= 0.6) {
    out.push({
      tone: 'info',
      title: `사용자의 ${pct(h.mobileShare)}가 모바일입니다`,
      action:
        '화면을 고칠 때 모바일 폭에서 먼저 확인합니다. 품질 탭의 모바일 점수가 실제 사용자 경험에 더 가깝습니다.',
    });
  }

  if (out.length === 0) {
    out.push({
      tone: 'good',
      title: '눈에 띄는 문제가 없습니다',
      action: '아래 차트에서 추이만 확인하면 됩니다.',
    });
  }
  return out;
};

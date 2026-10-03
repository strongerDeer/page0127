/**
 * 유입분석 화면이 GA4 에 물어볼 질문 목록과, 대답을 표로 바꾸는 순수 함수.
 *
 * GA4 Data API 는 "차원(dimension) × 측정항목(metric)" 으로 질문한다.
 *   차원   = 무엇별로 나눌지 (국가, 기기, 페이지 경로 …)
 *   측정항목 = 무엇을 셀지 (활성 사용자, 세션, 페이지뷰 …)
 * 이름 목록: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
 */

export type ReportKey =
  | 'summary'
  | 'channel'
  | 'sourceMedium'
  | 'country'
  | 'city'
  | 'pages'
  | 'landingBounce'
  | 'device'
  | 'browser'
  | 'os'
  | 'resolution'
  | 'dayOfWeek'
  | 'gender'
  | 'age';

export type ReportDef = {
  key: ReportKey;
  title: string;
  dimensions: string[];
  metrics: { name: string; label: string; format: MetricFormat }[];
  /** 정렬 기준 — 없으면 첫 측정항목 내림차순 */
  orderBy?: { dimension: string };
  limit: number;
  /** 비어 있을 때 이유 안내 (성별·연령처럼 원래 잘 비는 것) */
  emptyHint?: string;
};

export type MetricFormat = 'int' | 'percent' | 'seconds';

const users = { name: 'activeUsers', label: '사용자', format: 'int' } as const;
const sessions = { name: 'sessions', label: '세션', format: 'int' } as const;

// 성별·연령은 GA 관리 화면에서 "Google 신호 데이터"를 켜야 들어오고, 켜도 사용자가 적으면
// 개인을 알아볼 수 없도록 GA 가 숫자를 숨긴다(데이터 임곗값).
const DEMOGRAPHIC_HINT =
  'GA 관리 > 데이터 수집에서 Google 신호를 켜야 들어오며, 방문자가 적으면 GA 가 숨깁니다.';

export const REPORTS: ReportDef[] = [
  {
    key: 'summary',
    title: '요약',
    dimensions: [],
    metrics: [
      users,
      sessions,
      { name: 'screenPageViews', label: '페이지뷰', format: 'int' },
      { name: 'engagementRate', label: '참여율', format: 'percent' },
      {
        name: 'averageSessionDuration',
        label: '평균 세션 시간',
        format: 'seconds',
      },
    ],
    limit: 1,
  },
  {
    key: 'channel',
    title: '채널',
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: [sessions, users],
    limit: 10,
  },
  {
    key: 'sourceMedium',
    title: '소스 / 매체 / 캠페인',
    dimensions: ['sessionSource', 'sessionMedium', 'sessionCampaignName'],
    metrics: [sessions, users],
    limit: 15,
  },
  {
    key: 'country',
    title: '국가',
    dimensions: ['country'],
    metrics: [users],
    limit: 10,
  },
  {
    key: 'city',
    title: '도시',
    dimensions: ['city'],
    metrics: [users],
    limit: 15,
    emptyHint: 'GA 는 시/군/구가 아니라 도시 단위까지만 줍니다(IP 기반 추정).',
  },
  {
    key: 'pages',
    title: '인기 페이지',
    dimensions: ['pagePath'],
    metrics: [
      { name: 'screenPageViews', label: '페이지뷰', format: 'int' },
      users,
    ],
    limit: 15,
  },
  {
    // GA4 는 UA 시절의 "종료 페이지" 지표를 API 로 주지 않는다.
    // 대신 "들어오자마자 떠난 비율"이 높은 첫 페이지를 본다 — 고칠 곳을 찾는 데는 이쪽이 더 쓸모 있다.
    key: 'landingBounce',
    title: '첫 페이지별 이탈률',
    dimensions: ['landingPage'],
    metrics: [
      sessions,
      { name: 'bounceRate', label: '이탈률', format: 'percent' },
    ],
    limit: 15,
  },
  {
    key: 'device',
    title: '기기',
    dimensions: ['deviceCategory'],
    metrics: [users],
    limit: 5,
  },
  {
    key: 'browser',
    title: '브라우저',
    dimensions: ['browser'],
    metrics: [users],
    limit: 10,
  },
  {
    key: 'os',
    title: 'OS',
    dimensions: ['operatingSystem'],
    metrics: [users],
    limit: 10,
  },
  {
    key: 'resolution',
    title: '해상도',
    dimensions: ['screenResolution'],
    metrics: [users],
    limit: 10,
  },
  {
    key: 'dayOfWeek',
    title: '요일',
    dimensions: ['dayOfWeek'],
    metrics: [users, sessions],
    orderBy: { dimension: 'dayOfWeek' },
    limit: 7,
  },
  {
    key: 'gender',
    title: '성별',
    dimensions: ['userGender'],
    metrics: [users],
    limit: 5,
    emptyHint: DEMOGRAPHIC_HINT,
  },
  {
    key: 'age',
    title: '연령',
    dimensions: ['userAgeBracket'],
    metrics: [users],
    orderBy: { dimension: 'userAgeBracket' },
    limit: 10,
    emptyHint: DEMOGRAPHIC_HINT,
  },
];

/** 조회 기간 — 오늘은 아직 집계 중이라 어제까지 끊는다 */
export const GA_DATE_RANGE = { startDate: '28daysAgo', endDate: 'yesterday' };

/** runReport 요청 본문 */
export const toRunReportRequest = (def: ReportDef) => ({
  dateRanges: [GA_DATE_RANGE],
  dimensions: def.dimensions.map((name) => ({ name })),
  metrics: def.metrics.map(({ name }) => ({ name })),
  orderBys: [
    def.orderBy
      ? { dimension: { dimensionName: def.orderBy.dimension } }
      : { metric: { metricName: def.metrics[0].name }, desc: true },
  ],
  limit: def.limit,
});

/** GA 응답 한 줄의 모양 (필요한 필드만) */
export type GaRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

export type ReportTable = {
  /** 차원 값 (화면 표기로 바꾼 뒤) */
  rows: { labels: string[]; values: number[] }[];
};

export const parseReport = (
  def: ReportDef,
  gaRows: GaRow[] = []
): ReportTable => ({
  rows: gaRows.map((r) => ({
    labels: (r.dimensionValues ?? []).map((d, i) =>
      translateDimension(def.dimensions[i], d.value ?? '')
    ),
    values: (r.metricValues ?? []).map((m) => Number(m.value ?? 0)),
  })),
});

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const GENDER: Record<string, string> = {
  male: '남성',
  female: '여성',
  unknown: '알 수 없음',
};
const DEVICE: Record<string, string> = {
  mobile: '모바일',
  desktop: '데스크톱',
  tablet: '태블릿',
};

/** GA 원본 값 → 사람이 읽는 값. 모르는 값은 그대로 둔다 */
export const translateDimension = (
  dimension: string,
  value: string
): string => {
  if (value === '(not set)' || value === '') return '(알 수 없음)';
  switch (dimension) {
    case 'dayOfWeek':
      // GA 는 0=일요일 … 6=토요일 문자열로 준다
      return DAY_NAMES[Number(value)] ?? value;
    case 'userGender':
      return GENDER[value] ?? value;
    case 'deviceCategory':
      return DEVICE[value] ?? value;
    default:
      return value;
  }
};

export const formatMetric = (value: number, format: MetricFormat): string => {
  switch (format) {
    case 'percent':
      // GA 는 비율을 0~1 로 준다
      return `${(value * 100).toFixed(1)}%`;
    case 'seconds': {
      const s = Math.round(value);
      return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
    }
    default:
      return value.toLocaleString('ko-KR');
  }
};

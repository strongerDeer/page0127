import { type DateRange, MAX_RANGE_DAYS } from '@/shared/lib/admin/dateRange';

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
  | 'daily'
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
  | 'age'
  | 'humanSummary'
  | 'humanDaily'
  | 'shares'
  | 'appUsage';

export type ReportDef = {
  key: ReportKey;
  title: string;
  dimensions: string[];
  /** 표의 첫 열 머리글 — 없으면 '항목' */
  columnLabel?: string;
  metrics: { name: string; label: string; format: MetricFormat }[];
  /** 정렬 기준 — 없으면 첫 측정항목 내림차순 */
  orderBy?: { dimension: string };
  limit: number;
  /** 비어 있을 때 이유 안내 (성별·연령처럼 원래 잘 비는 것) */
  emptyHint?: string;
  /** GA Data API dimensionFilter (FilterExpression) — 행을 걸러서 센다 */
  dimensionFilter?: object;
};

export type MetricFormat = 'int' | 'percent' | 'seconds';

const users = { name: 'activeUsers', label: '사용자', format: 'int' } as const;
const sessions = { name: 'sessions', label: '세션', format: 'int' } as const;
const pageViews = {
  name: 'screenPageViews',
  label: '페이지뷰',
  format: 'int',
} as const;

/**
 * "사람으로 추정" = 한국에서 온 방문.
 * 측정 도구·관리자 기기는 브라우저에서 이미 안 보내지만, UA 를 위장한 크롤러는 막을 수 없다.
 * 그런 방문은 거의 해외 데이터센터에서 오고, 베타 모집도 국내라서 국가로 가른다.
 * 근거: 2026-10-26 GA 사용자 62명 vs 같은 날 Vercel Web Analytics(봇 제외) 한국 방문자 8명·해외 0명.
 */
export const HUMAN_FILTER = {
  filter: {
    fieldName: 'countryId',
    stringFilter: { matchType: 'EXACT', value: 'KR' },
  },
};

/** 공유 링크(features/share/lib/shareUrl)로 들어온 세션 — 캠페인 이름이 share_ 로 시작 */
export const SHARE_FILTER = {
  filter: {
    fieldName: 'sessionCampaignName',
    stringFilter: { matchType: 'BEGINS_WITH', value: 'share_' },
  },
};

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
      pageViews,
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
    key: 'daily',
    title: '일별 사용자',
    dimensions: ['date'],
    metrics: [users],
    orderBy: { dimension: 'date' },
    // 사용자 지정 기간 최대 길이만큼 — 하루 한 줄이라 기간이 길면 줄도 늘어난다
    limit: MAX_RANGE_DAYS,
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
    columnLabel: '소스 / 매체 / 캠페인',
    metrics: [sessions, users],
    limit: 15,
  },
  {
    // country(영문 이름) 대신 countryId(KR·US 같은 ISO 코드)를 받아 한국어 이름으로 바꾼다
    key: 'country',
    title: '국가',
    dimensions: ['countryId'],
    metrics: [users],
    limit: 10,
  },
  {
    key: 'city',
    title: '도시',
    dimensions: ['city', 'countryId'],
    columnLabel: '도시 / 국가',
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
  {
    key: 'humanSummary',
    title: '사람 추정 요약',
    dimensions: [],
    metrics: [users, sessions, pageViews],
    limit: 1,
    dimensionFilter: HUMAN_FILTER,
  },
  {
    key: 'humanDaily',
    title: '사람 추정 일별 사용자',
    dimensions: ['date'],
    metrics: [users],
    orderBy: { dimension: 'date' },
    limit: MAX_RANGE_DAYS,
    dimensionFilter: HUMAN_FILTER,
  },
  {
    key: 'shares',
    title: '공유로 들어온 방문',
    dimensions: ['sessionSource', 'sessionCampaignName'],
    columnLabel: '앱 / 공유한 것',
    metrics: [sessions, users],
    limit: 20,
    dimensionFilter: SHARE_FILTER,
  },
  {
    // 홈 화면 앱 — GoogleAnalytics 의 ga-init 이 보내는 이벤트(2026-10-27 부터 쌓임)
    key: 'appUsage',
    title: '홈 화면 앱',
    dimensions: ['eventName'],
    metrics: [
      { name: 'eventCount', label: '횟수', format: 'int' },
      { name: 'totalUsers', label: '사용자', format: 'int' },
    ],
    limit: 5,
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['app_open', 'app_install'] },
      },
    },
  },
];

/**
 * runReport 요청 본문.
 * 기간은 화면에서 고른 KST 날짜 그대로 넘긴다 — GA 는 'YYYY-MM-DD' 를 속성 시간대(KST)로
 * 해석한다. 끝은 parseDateRange 가 이미 어제 이하로 잘라 둔다(오늘은 집계 중).
 */
export const toRunReportRequest = (def: ReportDef, range: DateRange) => ({
  dateRanges: [{ startDate: range.from, endDate: range.to }],
  dimensions: def.dimensions.map((name) => ({ name })),
  metrics: def.metrics.map(({ name }) => ({ name })),
  orderBys: [
    def.orderBy
      ? { dimension: { dimensionName: def.orderBy.dimension } }
      : { metric: { metricName: def.metrics[0].name }, desc: true },
  ],
  limit: def.limit,
  ...(def.dimensionFilter ? { dimensionFilter: def.dimensionFilter } : {}),
});

/** GA 응답 한 줄의 모양 (필요한 필드만) */
export type GaRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

export type ReportRow = {
  /** 차원 값 (화면 표기로 바꾼 뒤) */
  labels: string[];
  /** GA 원본 차원 값 — 해석 규칙은 번역 문구가 아니라 이 값('KR', 'Organic Search')을 본다 */
  raw: string[];
  values: number[];
};

export type ReportTable = { rows: ReportRow[] };

export const parseReport = (
  def: ReportDef,
  gaRows: GaRow[] = []
): ReportTable => ({
  rows: gaRows.map((r) => {
    const raw = (r.dimensionValues ?? []).map((d) => d.value ?? '');
    return {
      labels: raw.map((v, i) => translateDimension(def.dimensions[i], v)),
      raw,
      values: (r.metricValues ?? []).map((m) => Number(m.value ?? 0)),
    };
  }),
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

/**
 * GA 기본 채널 그룹 → 한국어 이름과 풀이.
 * GA 가 "이 방문은 어떤 길로 왔나"를 자동으로 묶은 것이다.
 */
export const CHANNELS: Record<string, { name: string; desc: string }> = {
  Direct: {
    name: '직접 방문',
    desc: '주소를 직접 입력·북마크·카톡 링크 등 출처를 모르는 방문',
  },
  'Organic Search': {
    name: '검색',
    desc: '구글·네이버 검색 결과를 눌러 들어옴',
  },
  Referral: {
    name: '다른 사이트',
    desc: '블로그·커뮤니티 등 다른 사이트의 링크',
  },
  'Organic Social': { name: 'SNS', desc: '인스타그램·X·페이스북 등' },
  'Paid Search': { name: '검색 광고', desc: '돈을 낸 검색 광고' },
  'Paid Social': { name: 'SNS 광고', desc: '돈을 낸 SNS 광고' },
  Email: { name: '이메일', desc: '메일 속 링크' },
  Unassigned: {
    name: '분류 안 됨',
    desc: 'GA 가 길을 판단하지 못한 방문 — 봇·측정 도구가 흔히 여기에 잡힌다',
  },
};

// 브라우저 내장 국가명 사전 — 'KR' → '대한민국'. 라이브러리 없이 된다.
const regionNames = new Intl.DisplayNames(['ko'], { type: 'region' });

const countryName = (code: string): string => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    // 'ZZ' 처럼 사전에 없는 코드는 of() 가 RangeError 를 던진다
    return code;
  }
};

/** GA 원본 값 → 사람이 읽는 값. 모르는 값은 그대로 둔다 */
/**
 * 공유 링크 출처 — 받은 사람이 어느 앱 안에서 열었나(GoogleAnalytics 의 ga-init 이 바꿔 넣는다).
 * 'share' 는 앱 밖 브라우저(사파리·크롬)로 열었거나 앱을 알 수 없는 경우다.
 */
const SHARE_SOURCES: Record<string, string> = {
  share: '공유 (앱 모름)',
  kakaotalk: '카카오톡',
  instagram: '인스타그램',
  threads: '스레드',
  facebook: '페이스북',
  naver: '네이버 앱',
  line: '라인',
};
const SHARE_CAMPAIGNS: Record<string, string> = {
  share_library: '서재 공유',
  share_book: '책 공유',
};

export const translateDimension = (
  dimension: string,
  value: string
): string => {
  if (value === '(not set)' || value === '') return '(알 수 없음)';
  switch (dimension) {
    case 'date':
      // GA 는 'YYYYMMDD' 로 준다 → 차트 축에 쓰기 좋은 'MM/DD'
      return `${value.slice(4, 6)}/${value.slice(6, 8)}`;
    case 'countryId':
      return countryName(value);
    case 'sessionDefaultChannelGroup':
      return CHANNELS[value]?.name ?? value;
    case 'dayOfWeek':
      // GA 는 0=일요일 … 6=토요일 문자열로 준다
      return DAY_NAMES[Number(value)] ?? value;
    case 'userGender':
      return GENDER[value] ?? value;
    case 'deviceCategory':
      return DEVICE[value] ?? value;
    case 'sessionSource':
      return SHARE_SOURCES[value] ?? value;
    case 'sessionCampaignName':
      return SHARE_CAMPAIGNS[value] ?? value;
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

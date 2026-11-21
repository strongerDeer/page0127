/**
 * 서비스 소개 글 — /about 페이지·llms.txt·구조화 데이터가 함께 읽는 한 곳.
 *
 * 왜 한 파일에 모으나:
 * - AI 검색과 검색엔진은 "page0127.은 무엇인가"를 한 문장으로 인용한다.
 *   그 문장이 페이지마다 조금씩 다르면 서로 다른 서비스처럼 읽힐 수 있다.
 * - 화면(about), 텍스트 요약(llms.txt), JSON-LD(FAQPage)가 같은 원문을 쓰면
 *   한 곳만 고쳐도 셋이 같이 바뀐다.
 *
 * ⚠️ 실제로 있는 기능만 적는다. 없는 기능을 적으면 AI가 그대로 인용해 퍼뜨린다.
 */

export const SERVICE_NAME = 'page0127.';

/** 정의 문장 — 메타 설명·JSON-LD·llms.txt 첫 줄에 그대로 쓴다 */
export const SERVICE_DEFINITION =
  'page0127.은 읽은 책을 기록하고, 쌓인 책장으로 AI 독서 취향 분석과 다음 책 추천을 받는 무료 웹 독서 기록 서비스입니다.';

/** 한 줄 요약 아래에 붙는 짧은 사실들 */
export const SERVICE_FACTS = [
  '가격: 무료 (지금은 베타 서비스)',
  '이용 방법: 웹 브라우저 (PC·모바일), 홈 화면에 추가하면 앱처럼 열림',
  '가입: 카카오 또는 구글 계정',
  '만든 사람: 혼자 만드는 개인 프로젝트, 2025년 11월 시작',
] as const;

export type ServiceFeature = {
  title: string;
  description: string;
};

/** 주요 기능 — 홈 1~7장의 기능을 평평한 글로 옮긴 것 */
export const SERVICE_FEATURES: ServiceFeature[] = [
  {
    title: '책 기록',
    description:
      '책을 검색하거나 바코드를 찍어 담고, 별점·한줄평·읽은 날짜를 남겨요. 표나 CSV로 여러 권을 한 번에 옮겨 올 수도 있어요.',
  },
  {
    title: 'AI 독서 취향 분석과 책 추천',
    description:
      '별점을 남긴 완독 책이 다섯 권 모이면 AI가 독서 성향과 취향 노트를 써 주고, 다음에 읽을 책을 추천해요.',
  },
  {
    title: '간직한 문장',
    description:
      '책마다 밑줄 그은 문장을 모아 두고, 하루 한 번 오늘의 문장을 펼쳐요. 마음에 든 문장은 카드 이미지로 만들 수 있어요.',
  },
  {
    title: '독서 캘린더와 통계',
    description:
      '언제 무엇을 읽었는지 캘린더로 보고, 월별 완독 수·평점 분포·여덟 분야 독서 균형을 확인해요.',
  },
  {
    title: '공개 서재와 공유',
    description:
      'page0127.com/아이디 주소 하나로 내 책장을 보여 주고, 인스타그램 스토리에 올릴 이미지를 바로 만들어요.',
  },
  {
    title: '독서 케미',
    description:
      '다른 사람의 책장과 나란히 놓고 겹치는 책과 취향을 확인해요.',
  },
  {
    title: '배지와 라운지',
    description:
      '기록할수록 배지가 모이고, 팔로우한 사람과 올해 읽은 권수를 겨루는 리더보드가 있어요.',
  },
];

export type ServiceFaq = {
  question: string;
  answer: string;
};

/** 자주 묻는 질문 — 화면과 FAQPage JSON-LD가 같은 글을 쓴다 */
export const SERVICE_FAQ: ServiceFaq[] = [
  {
    question: 'page0127.은 어떤 서비스인가요?',
    answer: SERVICE_DEFINITION,
  },
  {
    question: '무료인가요?',
    answer: '네, 지금은 모든 기능을 무료로 쓸 수 있어요.',
  },
  {
    question: '앱을 설치해야 하나요?',
    answer:
      '아니요. 웹 브라우저에서 바로 쓰는 서비스예요. 모바일에서 홈 화면에 추가하면 앱처럼 열리고 알림도 받을 수 있어요.',
  },
  {
    question: 'AI 독서 취향 분석은 언제 볼 수 있나요?',
    answer:
      '별점을 남긴 완독 책이 다섯 권 모이면 볼 수 있어요. 책이 쌓일수록 분석이 더 또렷해져요.',
  },
  {
    question: '다른 곳에 기록한 책을 옮겨 올 수 있나요?',
    answer:
      '네. 엑셀이나 CSV 표를 붙여 넣으면 여러 권을 한 번에 담을 수 있어요.',
  },
  {
    question: '내 서재를 다른 사람이 볼 수 있나요?',
    answer:
      '서재는 page0127.com/아이디 주소로 공개돼요. 보여 주고 싶지 않은 책은 한 권씩 비공개로 바꿀 수 있어요.',
  },
];

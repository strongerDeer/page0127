/**
 * 사이트 운영 정보 — 한 곳에서만 고친다.
 *
 * 문의 창구: 카카오톡 1:1 오픈채팅. 링크가 바뀌면 여기 한 곳만 고치면
 * 푸터·contact 페이지·privacy 문의처가 모두 따라 바뀐다.
 */
export const SITE_INFO = {
  name: 'page0127',
  since: '2025년 11월',
  lastUpdated: '2026년 7월 13일',
  contact: {
    // 카카오톡 1:1 오픈채팅 — 방문자가 링크로 들어와 1:1 대화, 운영자는 카카오톡 알림으로 수신
    kakaoOpenChatUrl: 'https://open.kakao.com/o/scK1DkFi',
  },
} as const;

/**
 * 업데이트 로그 — git 이력에서 실제 배포된 것만 옮긴다.
 *
 * 날짜가 박힌 문자열이 화면에 있다는 건 누군가 갱신 책임을 지고 있다는 선언이다.
 * 개인 프로젝트일수록 강력하다. 지어내지 말 것 — 실제로 한 일만 적는다.
 */
export type ChangelogEntry = {
  date: string;
  title: string;
  description?: string;
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026.07.13',
    title: '디자인을 종이와 잉크의 색으로 다시 칠했어요',
    description:
      '책 표지에서 그림자를 걷어내고, 판형을 원본 그대로 살렸습니다. 전체 도서와 책 정보를 로그인 없이 볼 수 있게 열었어요.',
  },
  {
    date: '2026.07.11',
    title: '키보드만으로도 서비스를 쓸 수 있게 했어요',
    description: '스크린 리더 지원과 키보드 내비게이션을 보강했습니다.',
  },
  {
    date: '2026.07.09',
    title: '독서 궁합이 생겼어요',
    description:
      '두 사람의 책장을 나란히 놓고, 겹치는 관심사와 서로 다른 결을 찾아 서로에게 건넬 책을 골라 줍니다.',
  },
  {
    date: '2026.07.08',
    title: '독서 성향에 이름을 붙였어요',
    description:
      '"마음의 결을 읽는 사람", "이야기에 사는 사람" 같은 여덟 가지 성향 중 하나를 골라 드려요.',
  },
  {
    date: '2026.06.19',
    title: '한 곳이 실패해도 화면 전체가 죽지 않게 했어요',
  },
  {
    date: '2026.05.28',
    title: '사이드바와 모바일 하단 탭이 생겼어요',
  },
  {
    date: '2026.03.26',
    title: '알림이 실시간으로 도착해요',
    description: '주기적으로 확인하던 방식을 WebSocket으로 바꿨습니다.',
  },
  {
    date: '2025.11.25',
    title: 'page0127을 시작했어요',
  },
];

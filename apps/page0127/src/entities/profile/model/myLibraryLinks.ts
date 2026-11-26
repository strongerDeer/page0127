/**
 * "내 서재"에 딸린 곳 — PC 프로필 메뉴와 폰 ☰ 목차가 같은 목록을 쓴다(2026-11-26 HJ).
 *
 * 왜 한 파일인가: 문장 서랍·주간 회상·배지·AI 취향 분석은 서재 안 내용이라 상단 메뉴 칸엔 두지 않고,
 * "내 이름" 아래 묶음에서 닿게 했다. PC(프로필 드롭다운, features)와 폰(목차, widgets)이
 * 서로 다른 레이어라 목록을 각자 쓰면 한쪽만 바뀌기 쉽다 → 아래 레이어(entities)에 하나만 둔다.
 *
 * 아이콘은 화면마다 크기·모양이 달라 여기선 key 만 주고, 그리는 쪽이 고른다.
 */
export type MyLibraryLinkKey =
  'library' | 'quotes' | 'recap' | 'badges' | 'taste';

export type MyLibraryLink = {
  key: MyLibraryLinkKey;
  href: string;
  label: string;
};

/** 아이디를 아직 모르면(가입 직후 드문 과도 상태) 주소를 만들 수 없는 곳은 뺀다 */
export const getMyLibraryLinks = (username: string | null): MyLibraryLink[] => [
  ...(username
    ? [
        { key: 'library' as const, href: `/${username}`, label: '내 서재' },
        {
          key: 'quotes' as const,
          href: `/${username}/quotes`,
          label: '문장 서랍',
        },
      ]
    : []),
  // 알림·푸시·서재 링크가 모두 '주간 회상'이라 메뉴 이름도 같게 둔다
  { key: 'recap', href: '/books/recap', label: '주간 회상' },
  ...(username
    ? [
        {
          key: 'badges' as const,
          href: `/${username}/badges`,
          label: '배지 책장',
        },
      ]
    : []),
  // 결과가 없으면 페이지가 알아서 서재로 돌려보낸다
  { key: 'taste', href: '/dashboard/taste-analysis', label: 'AI 취향 분석' },
];

import type { MetadataRoute } from 'next';

/*
  웹 앱 매니페스트 — 홈 화면에 추가하면 설치형 앱(standalone)으로 열린다.

  왜 'standalone' 인가 (2026-10-22, 'browser' 에서 바꿈):
  - **iOS 는 홈 화면에 추가한 standalone 앱에서만 웹푸시를 받는다.** 사파리 탭에서는
    Notification 권한 자체를 물을 수 없다. 'browser' 로 두면 iOS 사용자는 푸시를 못 받는다.
  - 예전에 'browser' 로 둔 이유는 "오프라인 대응 없이 주소창을 없애면 연결이 끊겼을 때
    빈 화면"이었다. 이제 서비스워커(public/sw.js)가 끊긴 페이지 이동에 /offline.html 을
    대신 내준다.

  그 밖의 역할은 그대로다:
  1. 홈 화면 아이콘의 **이름과 아이콘** — 없으면 `<title>` 전체가 이름으로 잘려 들어간다.
  2. 안드로이드 크롬의 상단바 색을 브랜드 색으로 맞춘다.
*/
const manifest = (): MetadataRoute.Manifest => ({
  // id 를 박아 두면 start_url 을 나중에 바꿔도 브라우저가 "같은 앱"으로 본다
  id: '/',
  name: 'page0127.',
  short_name: 'page0127.',
  description:
    '읽은 책을 기록하면 AI 가 독서 취향을 분석하고 다음 책을 추천합니다.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  lang: 'ko-KR',
  background_color: '#ffffff',
  // brand/symbol-bg = blue/600. 파비콘 바탕과 같은 색이어야 상단바-아이콘이 이어져 보인다
  theme_color: '#1e69cb',
  icons: [
    {
      // app/icon.svg — 벡터라 어떤 크기로 늘려도 선명하다
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
    },
    {
      // app/icons/[size]/route.tsx — 크롬 설치 판정(192)·시작 화면(512)용 PNG
      src: '/icons/192',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icons/512',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      // app/apple-icon.tsx 가 만드는 PNG. 확장자 없는 경로로 서빙된다
      src: '/apple-icon',
      sizes: '180x180',
      type: 'image/png',
    },
  ],
});

export default manifest;

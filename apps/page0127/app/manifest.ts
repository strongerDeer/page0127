import type { MetadataRoute } from 'next';

/*
  웹 앱 매니페스트

  ⚠️ **PWA 를 하려는 게 아니다.** 서비스워커도 오프라인 지원도 없다.
  이 파일을 두는 이유는 두 가지뿐이다:

  1. 안드로이드에서 "홈 화면에 추가" 했을 때 **이름과 아이콘**이 제대로 뜨게 한다.
     매니페스트가 없으면 브라우저가 `<title>` 전체("page0127 - 책장을 보면, …")를
     아이콘 이름으로 쓴다 — 홈 화면에서 잘려 읽을 수 없게 된다.
  2. 안드로이드 크롬의 상단바 색을 브랜드 색으로 맞춘다.

  그래서 `display` 를 'browser' 로 둔다. 'standalone' 으로 두면 설치형 앱처럼
  주소창이 사라지고 설치 프롬프트가 뜨는데, 오프라인 대응이 없는 상태에서
  그렇게 하면 **연결이 끊겼을 때 빈 화면**을 보여 주게 된다.
*/
const manifest = (): MetadataRoute.Manifest => ({
  name: 'page0127',
  short_name: 'page0127',
  description: '읽은 책을 기록하면 AI 가 독서 취향을 분석하고 다음 책을 추천합니다.',
  start_url: '/',
  display: 'browser',
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
      // app/apple-icon.tsx 가 만드는 PNG. 확장자 없는 경로로 서빙된다
      src: '/apple-icon',
      sizes: '180x180',
      type: 'image/png',
    },
  ],
});

export default manifest;

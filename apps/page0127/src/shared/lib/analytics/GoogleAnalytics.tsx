import Script from 'next/script';

import { APP_PATTERNS } from '@/shared/lib/auth/inAppBrowser';

/**
 * 측정 도구의 브라우저 표식 — Lighthouse(PageSpeed Insights 포함)는 UA 에 'Chrome-Lighthouse',
 * Playwright 등 헤드리스 크롬은 'HeadlessChrome' 을 넣는다.
 */
export const MEASUREMENT_UA_PATTERN = /Chrome-Lighthouse|HeadlessChrome/;

/**
 * 운영이 아닌 곳에서 열린 페이지인가 — 로컬 `next dev`, Vercel 미리보기(PR 배포).
 * 여기서 본 화면은 전부 내 테스트라 GA 스크립트를 아예 넣지 않는다.
 * VERCEL_ENV 가 없으면(로컬 빌드·CI) 판단을 미루고 기존대로 둔다.
 */
export const isNonProductionEnv = (env: NodeJS.ProcessEnv): boolean =>
  env.NODE_ENV === 'development' ||
  (!!env.VERCEL_ENV && env.VERCEL_ENV !== 'production');

/**
 * 공유 링크(utm_source=share, features/share/lib/shareUrl)를 연 앱 — 인앱 브라우저 UA 로 안다.
 * 'other'(이름 모를 안드로이드 웹뷰)는 앱 이름이 아니라서 'share' 로 남긴다.
 * 인라인 스크립트에 넣을 수 있게 `[이름, /정규식/]` 배열 리터럴 문자열로 만든다.
 */
const SHARE_APP_PATTERNS_JS = `[${APP_PATTERNS.filter(
  ([app]) => app !== 'other'
)
  .map(([app, pattern]) => `['${app}', ${pattern}]`)
  .join(', ')}]`;

/** 홈 화면 앱으로 연 것을 이 세션에 이미 보냈는지 — 페이지를 옮길 때마다 세지 않게 */
const APP_OPEN_KEY = 'page0127:app-open-sent';

/** /admin 을 연 브라우저에 남기는 표시(MarkAdminDevice) — 있으면 GA 전송을 끈다 */
export const ADMIN_DEVICE_KEY = 'page0127:admin-device';

// Google Analytics 4 로더
// - 측정 ID(NEXT_PUBLIC_GA_ID)가 있을 때만 스크립트를 주입한다
//   → ID 미설정(로컬/미발급) 시 아무것도 렌더하지 않아 부작용 없음
// - next/script 의 afterInteractive 전략: 페이지 인터랙티브 이후 로드해 초기 성능 보호
export const GoogleAnalytics = () => {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId || isNonProductionEnv(process.env)) return null;

  // 홈 화면에 설치한 앱(standalone)으로 열었으면 세션마다 한 번 app_open, 설치 순간엔 app_install.
  // 여기(ga-init)서 보내는 이유: 컴포넌트 effect 는 GA 스크립트(afterInteractive)보다 먼저 돌 수 있어
  // trackEvent 가 gtag 없이 조용히 버려진다. appinstalled 는 안드로이드·PC 크롬만 알려 준다(iOS 없음).
  // 공유 링크로 들어왔으면 utm_source=share 를 연 앱 이름(kakaotalk·instagram …)으로 바꿔 보낸다.
  // 주소창은 그대로 두고 GA 에 보내는 page_location 만 바꾼다 — GA 는 세션 출처를 이 값에서 읽는다.
  // 측정 도구(매주 품질 측정·PageSpeed)·자동화 브라우저와 관리자 기기의 방문은 GA 로 보내지 않는다 — 유입분석에 섞인다.
  // navigator.webdriver: Playwright·Puppeteer·Selenium 이 조종하는 브라우저는 true 다.
  // UA 를 일반 크롬·아이폰으로 바꿔 끼운 자동화(Playwright devices 프리셋 등)는 UA 만으론 못 잡아서 함께 본다.
  // 스크립트 자체를 막지 않고 GA 공식 스위치(ga-disable-<ID>)로 **전송만** 끈다:
  // 스크립트를 빼면 측정 때만 외부 JS 비용이 사라져 성능 점수가 실제 사용자보다 좋게 나오고,
  // 지난 측정과 비교할 수 없게 된다.
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy='afterInteractive'
      />
      <Script id='ga-init' strategy='afterInteractive'>
        {`
          var isAdminDevice = false;
          try {
            isAdminDevice = localStorage.getItem('${ADMIN_DEVICE_KEY}') === '1';
          } catch (e) {}
          if (
            isAdminDevice ||
            navigator.webdriver === true ||
            ${MEASUREMENT_UA_PATTERN}.test(navigator.userAgent)
          ) {
            window['ga-disable-${gaId}'] = true;
          }
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          var pageLocation = null;
          try {
            var url = new URL(location.href);
            if (url.searchParams.get('utm_source') === 'share') {
              var apps = ${SHARE_APP_PATTERNS_JS};
              for (var i = 0; i < apps.length; i++) {
                if (apps[i][1].test(navigator.userAgent)) {
                  url.searchParams.set('utm_source', apps[i][0]);
                  pageLocation = url.toString();
                  break;
                }
              }
            }
          } catch (e) {}
          gtag('config', '${gaId}', pageLocation ? { page_location: pageLocation } : {});
          try {
            var standalone =
              window.matchMedia('(display-mode: standalone)').matches ||
              navigator.standalone === true;
            if (standalone && !sessionStorage.getItem('${APP_OPEN_KEY}')) {
              sessionStorage.setItem('${APP_OPEN_KEY}', '1');
              gtag('event', 'app_open');
            }
            window.addEventListener('appinstalled', function () {
              gtag('event', 'app_install');
            });
          } catch (e) {}
        `}
      </Script>
    </>
  );
};

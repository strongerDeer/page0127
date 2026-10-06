import Script from 'next/script';

/**
 * 측정 도구의 브라우저 표식 — Lighthouse(PageSpeed Insights 포함)는 UA 에 'Chrome-Lighthouse',
 * Playwright 등 헤드리스 크롬은 'HeadlessChrome' 을 넣는다.
 */
export const MEASUREMENT_UA_PATTERN = /Chrome-Lighthouse|HeadlessChrome/;

// Google Analytics 4 로더
// - 측정 ID(NEXT_PUBLIC_GA_ID)가 있을 때만 스크립트를 주입한다
//   → ID 미설정(로컬/미발급) 시 아무것도 렌더하지 않아 부작용 없음
// - next/script 의 afterInteractive 전략: 페이지 인터랙티브 이후 로드해 초기 성능 보호
export const GoogleAnalytics = () => {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) return null;

  // 측정 도구(매주 품질 측정·PageSpeed)의 방문은 GA 로 보내지 않는다 — 유입분석에 사람 아닌 방문이 섞인다.
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
          if (${MEASUREMENT_UA_PATTERN}.test(navigator.userAgent)) {
            window['ga-disable-${gaId}'] = true;
          }
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
};

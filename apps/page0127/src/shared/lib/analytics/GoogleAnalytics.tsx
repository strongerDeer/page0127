import Script from 'next/script';

// Google Analytics 4 로더
// - 측정 ID(NEXT_PUBLIC_GA_ID)가 있을 때만 스크립트를 주입한다
//   → ID 미설정(로컬/미발급) 시 아무것도 렌더하지 않아 부작용 없음
// - next/script 의 afterInteractive 전략: 페이지 인터랙티브 이후 로드해 초기 성능 보호
export const GoogleAnalytics = () => {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy='afterInteractive'
      />
      <Script id='ga-init' strategy='afterInteractive'>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
};

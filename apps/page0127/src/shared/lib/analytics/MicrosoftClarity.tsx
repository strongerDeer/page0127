import Script from 'next/script';

import {
  ADMIN_DEVICE_KEY,
  isNonProductionEnv,
  MEASUREMENT_UA_PATTERN,
} from './GoogleAnalytics';

/**
 * Microsoft Clarity 로더 — 히트맵·세션 녹화로 "사람들이 화면에서 실제로 어떻게 움직이는지" 본다.
 * GA 가 "몇 명이 어디까지 왔나"(숫자)라면, Clarity 는 "왜 거기서 멈췄나"(장면)를 보여 준다.
 *
 * GoogleAnalytics 와 같은 규칙을 따른다.
 * - 프로젝트 ID(NEXT_PUBLIC_CLARITY_ID)가 있을 때만, 운영에서만 넣는다.
 *   → ID 를 Vercel 환경변수에 넣는 순간이 "녹화 시작" 스위치다(코드 배포와 분리).
 * - next/script lazyOnload: 페이지가 다 뜨고 브라우저가 한가해진 뒤에 붙인다.
 *   처음엔 afterInteractive(하이드레이션 직후)였는데, 2026-11-23 Clarity 허용/차단 A/B 측정
 *   (모바일·CPU 4x, 5회 번갈아 중앙값)에서 TBT 가 library +70·profile +84·bookinfo +33ms
 *   늘어 있었다. 녹화 스크립트가 첫 로드의 메인 스레드 작업과 겹친 것이다.
 *   대가: 몇 초 만에 나가는 아주 짧은 방문은 녹화에서 빠질 수 있다(HJ 가 알고 고름).
 *
 * 제외 규칙
 * - 관리자 기기: 스크립트를 아예 붙이지 않는다. 운영 콘솔에는 다른 사람의 정보가 보이는데,
 *   녹화는 화면 내용을 외부(Microsoft)로 보내기 때문이다. GA 처럼 "전송만 끄는" 공식 스위치가 없다.
 * - 측정 도구·자동화 브라우저: 스크립트는 그대로 붙이고(성능 점수를 실제 사용자와 같은 조건으로 유지),
 *   measurement 태그만 달아 Clarity 대시보드 필터에서 뺄 수 있게 한다.
 *
 * CSP: next.config.ts 의 script-src·connect-src·img-src 에 *.clarity.ms·c.bing.com 이 열려 있어야 한다.
 * (안 열면 브라우저가 조용히 막아 녹화가 0건이 된다)
 */
export const MicrosoftClarity = () => {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  if (!clarityId || isNonProductionEnv(process.env)) return null;

  // 아래 (function(c,l,a,r,i,t,y){…}) 부분은 Clarity 가 주는 공식 설치 코드 그대로다.
  // clarity() 호출을 큐(c[a].q)에 쌓아 두었다가, 본 스크립트가 도착하면 한꺼번에 처리한다.
  // 그래서 스크립트가 오기 전에 부른 clarity('set', …)도 잃어버리지 않는다.
  return (
    <Script id='clarity-init' strategy='lazyOnload'>
      {`
        var isAdminDevice = false;
        try {
          isAdminDevice = localStorage.getItem('${ADMIN_DEVICE_KEY}') === '1';
        } catch (e) {}
        if (!isAdminDevice) {
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", ${JSON.stringify(clarityId)});
          if (
            navigator.webdriver === true ||
            ${MEASUREMENT_UA_PATTERN}.test(navigator.userAgent)
          ) {
            window.clarity('set', 'measurement', 'true');
          }
        }
      `}
    </Script>
  );
};

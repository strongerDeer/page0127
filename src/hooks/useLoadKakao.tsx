import Script from 'next/script';

declare global {
  interface Window {
    Kakao: any;
  }
}
export default function LoadKakao() {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js"
      onLoad={() => {
        // 초기화가 되어있지 않다면
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_API);
        }
      }}
    />
  );
}

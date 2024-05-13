import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window {
    Kakao: any;
  }
}
export default function Share() {
  return (
    <>
      <section>
        <h2>공유하기</h2>
        <button type="button" id="kakaoShare">
          카카오톡 공유하기
        </button>

        <button type="button">링크 복사하기</button>
      </section>

      {/* Script */}
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js"
        onLoad={() => {
          // 초기화가 되어있지 않다면
          if (!window.Kakao.isInitialized()) {
            window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_API);
          }

          const shareMessage = () => {
            window.Kakao.Share.sendDefault({
              objectType: 'feed',
              content: {
                title: 'page0127',
                description: '강혜진님의 책장',
                imageUrl:
                  'http://k.kakaocdn.net/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png',
                link: {
                  mobileWebUrl: 'https://developers.kakao.com',
                  webUrl: 'https://developers.kakao.com',
                },
              },
              buttons: [
                {
                  title: '책장 구경 하기',
                  link: {
                    mobileWebUrl: 'https://developers.kakao.com',
                    webUrl: 'https://developers.kakao.com',
                  },
                },
              ],
            });
          };

          const shareBtn = document.querySelector('#kakaoShare');
          shareBtn?.addEventListener('click', () => shareMessage());
        }}
      />
    </>
  );
}

import useShare from '@hooks/useShare';
import { User } from '@models/user';
import Script from 'next/script';

declare global {
  interface Window {
    Kakao: any;
  }
}
export default function KakaoShareButton({ userData }: { userData: User }) {
  const share = useShare();
  return (
    <>
      <button
        onClick={() => {
          share({
            title: userData.displayName ?? '',
            description: userData.displayName ?? '',
            imageUrl: userData.photoURL || '',
            buttonLabel: `${userData.displayName} 책장 구경하기`,
          });
        }}
      >
        카카오톡 공유하기
      </button>
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js"
        onLoad={() => {
          // 초기화가 되어있지 않다면
          if (!window.Kakao.isInitialized()) {
            window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_API);
          }
        }}
      />
    </>
  );
}

import { useCallback } from 'react';

interface shareProps {
  title: string;
  description: string;
  imageUrl: string;
  buttonLabel: string;
}
export default function useShare() {
  const handleShare = useCallback(
    ({ title, description, imageUrl, buttonLabel }: shareProps) => {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `${title} | page0127`,
          description,
          imageUrl,
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
        buttons: [
          {
            title: buttonLabel,
            link: {
              mobileWebUrl: window.location.href,
              webUrl: window.location.href,
            },
          },
        ],
      });
    },
    [],
  );
  return handleShare;
}

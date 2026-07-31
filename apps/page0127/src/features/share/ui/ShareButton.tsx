'use client';

import { useState } from 'react';

import { Button } from '@repo/ui';
import { Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

type ShareButtonProps = {
  /** 공유할 경로. 절대 URL 은 이 컴포넌트가 현재 origin 으로 만든다 */
  path: string;
  /** 네이티브 공유 시트에 뜨는 제목 */
  title: string;
  /** 공유 시트 본문. 카톡 등에서 링크 위에 붙는다 */
  text?: string;
  /** 버튼에 보일 문구. 없으면 아이콘만 (아이콘 버튼) */
  label?: string;
};

/**
 * 공유 버튼 — 네이티브 공유 시트가 있으면 그걸 쓰고, 없으면 주소를 복사한다.
 *
 * 왜 둘 다 필요한가:
 * navigator.share 는 모바일 브라우저에서 카톡·메시지로 바로 보낼 수 있는 경로다
 * (이 서비스에서 공유가 실제로 일어나는 곳). 다만 데스크톱 브라우저 상당수와
 * 비보안 컨텍스트에서는 없으므로, 그때는 기존 방식대로 주소를 복사한다.
 */
export const ShareButton = ({ path, title, text, label }: ShareButtonProps) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    // origin 은 브라우저에서만 알 수 있다 — 서버 렌더 시점에는 window 가 없다
    const url = `${window.location.origin}${path}`;

    if (navigator.share) {
      // 공유 시트가 열려 있는 동안 다시 호출하면 InvalidStateError 가 난다
      if (isSharing) return;
      setIsSharing(true);

      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // 사용자가 공유 시트를 닫은 것은 실패가 아니다 — 아무 말도 하지 않는다
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        // 그 밖의 실패(권한 등)는 복사로 떨어진다
      } finally {
        setIsSharing(false);
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('주소를 복사했어요.');
    } catch {
      toast.error('주소를 복사하지 못했어요.');
    }
  };

  const Icon = label ? Share2 : Link2;

  return (
    <Button
      variant='outline'
      size={label ? 'md' : 'icon-md'}
      className='shadow-none'
      onClick={handleShare}
      title={title}
    >
      {/* 아이콘만 있는 버튼은 스크린리더가 읽을 이름이 없다 */}
      {!label && <span className='sr-only'>{title}</span>}
      <Icon className='h-4 w-4' />
      {label}
    </Button>
  );
};

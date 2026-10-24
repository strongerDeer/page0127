'use client';

import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { Download, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { ShareButton } from './ShareButton';

type ShareSheetButtonProps = {
  /** 공유할 페이지 경로 — 링크 공유에 쓴다 */
  path: string;
  /** 공유 이미지를 그리는 경로 (같은 origin) */
  imagePath: string;
  /** 저장·공유될 이미지 파일 이름 */
  fileName: string;
  /** 공유되는 것의 제목 — 휴대폰 공유 시트·받는 쪽에 보인다 ("OO님의 책장") */
  title: string;
  /** 시트 제목·버튼 이름 ("서재 공유하기") */
  sheetTitle: string;
  /** 링크 공유 본문 */
  text?: string;
};

/** 이보다 오래 걸리면 문구를 바꿔 "멈춘 게 아니다"를 알린다 */
const SLOW_LOADING_MS = 3000;

/**
 * 이미지를 그리는 동안의 자리 — 서버가 책등을 하나씩 받아 그려서 몇 초 걸린다.
 * 회색 칸만 깜빡이면 기다려도 되는지 알 수 없다. 무엇을 하는 중인지 말하고, 길어지면 말을 바꾼다.
 */
const ImageLoading = () => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role='status'
      className='flex h-full w-full flex-col items-center justify-center gap-3 bg-sunken px-4 text-center'
    >
      <Loader2
        aria-hidden='true'
        className='size-7 animate-spin text-primary motion-reduce:animate-none'
      />
      <p className='break-keep text-sm font-medium text-text-body'>
        서재 이미지를 그리고 있어요
      </p>
      <p className='break-keep text-xs text-text-subtle'>
        {slow
          ? '책을 한 권씩 꽂는 중이에요. 조금만 기다려 주세요.'
          : '책장을 펼치는 중…'}
      </p>
    </div>
  );
};

type ImageState =
  | { status: 'loading' }
  | { status: 'ready'; file: File; url: string }
  | { status: 'error' };

/**
 * 공유 버튼 하나 → 작은 공유 시트(미리보기 · 이미지 공유 · 링크 공유).
 *
 * 학습 포인트:
 * - 플랫폼별 버튼(인스타·카톡)을 두지 않는다. 어느 앱으로 보낼지는 휴대폰 공유 시트가 정한다.
 * - 이미지는 **시트가 열릴 때 미리 받는다.** iOS 사파리는 navigator.share 를 "누른 직후"에만
 *   허락한다(transient activation). 누른 뒤에 이미지를 받으면 그 사이 허락이 사라져
 *   NotAllowedError 가 난다. 그래서 버튼을 누르는 순간엔 파일이 이미 손에 있어야 한다.
 * - 파일 공유를 못 하는 곳(대부분의 데스크톱)은 저장(다운로드)으로 떨어진다.
 */
export const ShareSheetButton = ({
  path,
  imagePath,
  fileName,
  title,
  sheetTitle,
  text,
}: ShareSheetButtonProps) => {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<ImageState>({ status: 'loading' });

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 열 때마다 새로 받는다(서재가 바뀌었을 수 있다)
    setImage({ status: 'loading' });

    fetch(imagePath, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setImage({
          status: 'ready',
          file: new File([blob], fileName, { type: blob.type || 'image/png' }),
          url: objectUrl,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('공유 이미지 받기 실패:', error);
        setImage({ status: 'error' });
      });

    // 닫으면 받던 것을 멈추고, 만든 미리보기 주소를 돌려준다(메모리)
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, imagePath, fileName]);

  const canShareFile =
    image.status === 'ready' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.canShare?.({ files: [image.file] }));

  const handleImage = async () => {
    if (image.status !== 'ready') return;

    if (canShareFile) {
      try {
        // 파일만 보낸다 — 링크를 같이 넣으면 앱마다 하나를 버린다(인스타는 링크, 어떤 앱은 이미지)
        await navigator.share({ files: [image.file], title });
        trackEvent('share_click', { method: 'image_share', path });
      } catch (error) {
        // 시트를 닫은 것은 실패가 아니다
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        toast.error('이미지를 공유하지 못했어요.');
      }
      return;
    }

    const link = document.createElement('a');
    link.href = image.url;
    link.download = fileName;
    link.click();
    trackEvent('share_click', { method: 'image_download', path });
  };

  return (
    <>
      <Button
        variant='outline'
        size='icon-md'
        className='shadow-none'
        onClick={() => setOpen(true)}
        title={sheetTitle}
      >
        {/* 아이콘만 있는 버튼은 스크린리더가 읽을 이름이 없다 */}
        <span className='sr-only'>{sheetTitle}</span>
        <Share2 className='h-4 w-4' />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{sheetTitle}</DialogTitle>
            <DialogDescription className='break-keep'>
              이미지는 스토리·게시물에, 링크는 메시지로 보내기 좋아요.
            </DialogDescription>
          </DialogHeader>

          {/* 9:16 미리보기 — 높이를 정하고 폭은 비율로. 작은 폰에서도 버튼이 화면 안에 남는다 */}
          <div className='mx-auto flex aspect-9/16 h-[min(50vh,480px)] items-center justify-center overflow-hidden rounded-xl bg-sunken'>
            {image.status === 'ready' ? (
              // 받아 둔 blob 주소라 next/image 최적화를 거칠 수 없다
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={`${title} 미리보기`}
                className='h-full w-full animate-in object-contain fade-in duration-300 motion-reduce:animate-none'
              />
            ) : image.status === 'error' ? (
              <p className='break-keep px-4 text-center text-sm text-text-subtle'>
                이미지를 만들지 못했어요.
                <br />
                링크로는 공유할 수 있어요.
              </p>
            ) : (
              <ImageLoading />
            )}
          </div>

          <div className='flex flex-col gap-2'>
            <Button
              onClick={handleImage}
              disabled={image.status !== 'ready'}
              className='w-full gap-2'
            >
              {image.status === 'loading' ? (
                <>
                  <Loader2
                    aria-hidden='true'
                    className='h-4 w-4 animate-spin motion-reduce:animate-none'
                  />
                  이미지 준비 중…
                </>
              ) : (
                <>
                  {canShareFile ? (
                    <Share2 aria-hidden='true' className='h-4 w-4' />
                  ) : (
                    <Download aria-hidden='true' className='h-4 w-4' />
                  )}
                  {canShareFile ? '이미지 공유하기' : '이미지 저장하기'}
                </>
              )}
            </Button>
            <ShareButton
              path={path}
              title={title}
              text={text}
              label='링크 공유하기'
              className='w-full'
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

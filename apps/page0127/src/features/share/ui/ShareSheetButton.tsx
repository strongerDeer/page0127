'use client';

import { useEffect, useState } from 'react';

import {
  Button,
  cn,
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

import type { ReactNode } from 'react';

type ShareSheetButtonProps = {
  /**
   * 공유할 페이지 경로 — 링크 공유에 쓴다.
   * 없으면 링크 공유 버튼을 그리지 않는다 — 문장 카드처럼 남이 열 수 있는 페이지가 없는 것
   */
  path?: string;
  /** 공유 이미지를 그리는 경로 (같은 origin) */
  imagePath: string;
  /** 저장·공유될 이미지 파일 이름 */
  fileName: string;
  /** 공유되는 것의 제목 — 휴대폰 공유 시트·받는 쪽에 보인다 ("OO님의 책장") */
  title: string;
  /** 시트 제목·버튼 이름 ("서재 공유하기") */
  sheetTitle: string;
  /** 이미지를 그리는 동안의 문구 — 기본은 서재(책장) 문구 */
  loadingMessages?: LoadingMessages;
  /** 있으면 아이콘 옆에 글자를 붙인 버튼 — 없으면 아이콘만(헤더처럼 자리가 좁은 곳) */
  triggerLabel?: string;
  /** 글자 버튼의 모양을 바꿀 때 — 파란 무대 위 연말 응원 카드처럼 배경이 다른 곳 */
  triggerClassName?: string;
  /** true면 글자 버튼을 큰 보조 버튼으로 — 홈 첫 화면처럼 큰 버튼 옆에 나란히 설 때 */
  prominent?: boolean;
  /** true면 아이콘 버튼을 작은 고스트 버튼으로 — 문장 한 줄 옆의 고치기·지우기 버튼과 나란히 설 때 */
  compact?: boolean;
  /** 시트 설명 — 기본은 이미지·링크 둘 다 있을 때의 문구 */
  description?: string;
  /**
   * 버튼을 직접 그릴 때 — 오늘의 문장처럼 화면만의 버튼 모양(종이 위 알약)이 따로 있는 곳.
   * 받은 open 을 누를 때 부르면 같은 시트가 열린다. 주면 triggerLabel·prominent·compact 는 쓰지 않는다.
   */
  renderTrigger?: (open: () => void) => ReactNode;
};

type LoadingMessages = {
  title: string;
  /** 처음 몇 초 */
  wait: string;
  /** SLOW_LOADING_MS 가 지나도 안 끝났을 때 */
  slow: string;
};

const SHELF_LOADING: LoadingMessages = {
  title: '서재 이미지를 그리고 있어요',
  wait: '책장을 펼치는 중…',
  slow: '책을 한 권씩 꽂는 중이에요. 조금만 기다려 주세요.',
};

/** 이보다 오래 걸리면 문구를 바꿔 "멈춘 게 아니다"를 알린다 */
const SLOW_LOADING_MS = 3000;

/**
 * 이미지를 그리는 동안의 자리 — 서버가 책등을 하나씩 받아 그려서 몇 초 걸린다.
 * 회색 칸만 깜빡이면 기다려도 되는지 알 수 없다. 무엇을 하는 중인지 말하고, 길어지면 말을 바꾼다.
 */
const ImageLoading = ({ messages }: { messages: LoadingMessages }) => {
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
        {messages.title}
      </p>
      <p className='break-keep text-xs text-text-subtle'>
        {slow ? messages.slow : messages.wait}
      </p>
    </div>
  );
};

type ImageState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error' };

/**
 * 공유 버튼 하나 → 작은 공유 시트(미리보기 · 이미지 저장 · 링크 공유).
 *
 * 학습 포인트:
 * - 플랫폼별 버튼(인스타·카톡)을 두지 않는다. 링크는 휴대폰 공유 시트가 보낼 앱을 정한다.
 * - 이미지는 **저장(다운로드)만** 한다. 예전엔 navigator.share 로 파일을 보냈는데,
 *   맥에선 저장할 길이 없었고 공유 → 붙여넣기 하면 이미지가 두 장 붙었다(2026-11-28 HJ).
 *   저장한 그림을 사용자가 원하는 곳에 직접 올리는 쪽이 예측 가능하다.
 * - 이미지는 **시트가 열릴 때 미리 받는다.** 미리보기도 보여 주고, 누르면 기다림 없이 바로 저장된다.
 */
export const ShareSheetButton = ({
  path,
  imagePath,
  fileName,
  title,
  sheetTitle,
  loadingMessages = SHELF_LOADING,
  triggerLabel,
  triggerClassName,
  prominent = false,
  compact = false,
  description = '이미지는 저장해서 스토리·게시물에, 링크는 메시지로 보내기 좋아요.',
  renderTrigger,
}: ShareSheetButtonProps) => {
  // 지표의 path — 링크가 없는 공유(문장 카드)는 이미지 경로로 센다
  const trackPath = path ?? imagePath;
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
        setImage({ status: 'ready', url: objectUrl });
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
  }, [open, imagePath]);

  /** 받아 둔 이미지를 파일로 내려받는다 — PC는 다운로드 폴더, 폰은 브라우저가 묻는 저장 위치로 */
  const downloadImage = () => {
    if (image.status !== 'ready') return;
    try {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = fileName;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
      trackEvent('share_click', { method: 'image_download', path: trackPath });
      toast.success('이미지를 저장했어요.');
    } catch {
      toast.error('이미지를 저장하지 못했어요. 링크로 공유해 주세요.');
    }
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : triggerLabel ? (
        <Button
          variant={prominent ? 'secondary' : 'outline'}
          size={prominent ? 'lg' : 'sm'}
          className={cn('gap-1.5 shadow-none', triggerClassName)}
          onClick={() => setOpen(true)}
        >
          <Share2
            aria-hidden='true'
            className={prominent ? 'size-4' : 'size-3.5'}
          />
          {triggerLabel}
        </Button>
      ) : (
        <Button
          variant={compact ? 'ghost' : 'outline'}
          size={compact ? 'icon-sm' : 'icon-md'}
          className='shadow-none'
          onClick={() => setOpen(true)}
          title={sheetTitle}
        >
          {/* 아이콘만 있는 버튼은 스크린리더가 읽을 이름이 없다 */}
          <span className='sr-only'>{sheetTitle}</span>
          <Share2 className={compact ? 'size-3.5' : 'h-4 w-4'} />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{sheetTitle}</DialogTitle>
            <DialogDescription className='break-keep'>
              {description}
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
              <ImageLoading messages={loadingMessages} />
            )}
          </div>

          {/* 한 줄에 반반 — 링크가 없는 공유(문장 카드)는 저장 버튼 하나가 꽉 찬다.
              이미지 저장이 이 시트의 주 동작이라 오른쪽(사이트 규칙: 주 버튼 오른쪽) */}
          <div className={cn('grid gap-2', path && 'grid-cols-2')}>
            {path && (
              <ShareButton
                path={path}
                title={title}
                label='링크 공유'
                className='w-full'
              />
            )}
            <Button
              onClick={downloadImage}
              disabled={image.status !== 'ready'}
              className='w-full gap-2'
            >
              {image.status === 'loading' ? (
                <>
                  <Loader2
                    aria-hidden='true'
                    className='h-4 w-4 animate-spin motion-reduce:animate-none'
                  />
                  준비 중…
                </>
              ) : (
                <>
                  <Download aria-hidden='true' className='h-4 w-4' />
                  이미지 저장하기
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

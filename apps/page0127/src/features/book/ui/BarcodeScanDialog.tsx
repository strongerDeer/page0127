'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@repo/ui';
import { ImageUp } from 'lucide-react';

import { createIsbnDetector } from '@/features/book/lib/createIsbnDetector';

type BarcodeScanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 읽어 낸 ISBN13 과 읽은 방법. 부르면 창은 호출 측이 닫는다. */
  onDetected: (isbn: string, source: 'camera' | 'photo') => void;
};

type ScanStatus =
  | 'starting' // 인식기·카메라 준비 중
  | 'scanning' // 화면을 비추는 중
  | 'denied' // 카메라 권한 거부
  | 'no-camera' // 카메라가 없거나 쓸 수 없는 환경(인앱 브라우저 등)
  | 'failed'; // 그 밖의 오류

// 프레임마다 읽으면 저사양 폰이 뜨거워진다 — 사람이 바코드를 맞추는 속도면 충분하다
const SCAN_INTERVAL_MS = 300;

const STATUS_MESSAGE: Record<Exclude<ScanStatus, 'scanning'>, string> = {
  starting: '카메라를 켜는 중이에요…',
  denied:
    '카메라 권한이 꺼져 있어요. 브라우저 설정에서 카메라를 허용하거나, 바코드 사진을 올려 주세요.',
  'no-camera':
    '이 기기에서는 카메라를 쓸 수 없어요. 바코드 사진을 올려 주세요.',
  failed: '카메라를 켜지 못했어요. 바코드 사진을 올려 주세요.',
};

type IsbnDetect = Awaited<ReturnType<typeof createIsbnDetector>>;

// 인식기는 한 번만 만든다(WASM 로딩이 무겁다) — 창을 다시 열어도 재사용
let detectPromise: Promise<IsbnDetect> | null = null;
const getDetect = () => {
  detectPromise ??= createIsbnDetector().catch((error) => {
    detectPromise = null; // 실패하면 다음에 다시 시도할 수 있게 비운다
    throw error;
  });
  return detectPromise;
};

/**
 * 바코드로 책 찾기 — 카메라로 비추거나 사진을 올려 ISBN 을 읽는다.
 *
 * 휴대폰은 후면 카메라, PC 는 웹캠을 쓴다. 노트북 웹캠은 초점이 고정이라 잘 안 읽힐
 * 수 있어서, 카메라가 켜져 있어도 "사진에서 읽기"를 항상 함께 보여 준다.
 * 인스타그램 같은 앱 안 브라우저는 카메라 권한이 막히는 경우가 있는데, 그때도
 * 사진 올리기로 이어 갈 수 있다.
 */
export const BarcodeScanDialog = ({
  open,
  onOpenChange,
  onDetected,
}: BarcodeScanDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className='sm:max-w-sm break-keep'>
      <div className='space-y-1'>
        <DialogTitle className='text-lg font-bold text-text-strong'>
          바코드로 책 찾기
        </DialogTitle>
        <DialogDescription>
          책 뒤표지의 바코드를 네모 안에 비춰 주세요.
        </DialogDescription>
      </div>
      {/*
        창 내용은 열려 있을 때만 마운트된다(Radix). 그래서 카메라는 ScanPanel 이
        마운트될 때 켜고 언마운트될 때 끈다 — 열 때마다 상태도 처음부터 시작한다.
      */}
      <ScanPanel onDetected={onDetected} />
    </DialogContent>
  </Dialog>
);

const ScanPanel = ({
  onDetected,
}: Pick<BarcodeScanDialogProps, 'onDetected'>) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ScanStatus>('starting');
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);

  // 닫히면(언마운트) 스트림을 꼭 멈춘다 — 안 그러면 카메라 표시등이 계속 켜져 있다
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('no-camera');
        return;
      }

      try {
        // 카메라와 인식기를 함께 준비한다 — 순서대로 하면 기다림이 두 번이다
        const [detect, media] = await Promise.all([
          getDetect(),
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          }),
        ]);
        stream = media;
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        if (cancelled) return;
        setStatus('scanning');

        const tick = async () => {
          if (cancelled) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const isbn = await detect(video).catch(() => null);
            if (cancelled) return;
            if (isbn) {
              onDetected(isbn, 'camera');
              return;
            }
          }
          timer = setTimeout(tick, SCAN_INTERVAL_MS);
        };
        tick();
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setStatus('denied');
        } else if (
          name === 'NotFoundError' ||
          name === 'OverconstrainedError' ||
          name === 'NotReadableError'
        ) {
          setStatus('no-camera');
        } else {
          console.error('바코드 스캔 시작 실패:', error);
          setStatus('failed');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // onDetected 가 바뀔 때마다 카메라를 껐다 켜지 않도록 마운트 때 한 번만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 사진을 다시 골라도 change 가 일어나게
    if (!file) return;

    setIsReadingPhoto(true);
    setPhotoMessage(null);
    try {
      const [detect, image] = await Promise.all([
        getDetect(),
        createImageBitmap(file),
      ]);
      const isbn = await detect(image);
      image.close();
      if (isbn) {
        onDetected(isbn, 'photo');
      } else {
        setPhotoMessage(
          '사진에서 책 바코드를 찾지 못했어요. 바코드가 크고 또렷하게 나오게 다시 찍어 주세요.'
        );
      }
    } catch (error) {
      console.error('바코드 사진 읽기 실패:', error);
      setPhotoMessage(
        '사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.'
      );
    } finally {
      setIsReadingPhoto(false);
    }
  };

  const showVideo = status === 'starting' || status === 'scanning';

  return (
    <>
      {showVideo ? (
        <div className='relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black'>
          {/* iOS 사파리는 playsInline·muted 가 없으면 전체 화면으로 튀거나 재생을 막는다 */}
          <video
            ref={videoRef}
            className='h-full w-full object-cover'
            playsInline
            muted
          />
          {/* 조준 가이드 — 바코드는 가로로 긴 모양이다 */}
          <div
            aria-hidden
            className='pointer-events-none absolute inset-x-[12%] top-1/2 h-[34%] -translate-y-1/2 rounded-md border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]'
          />
          {status === 'starting' && (
            <p className='absolute inset-x-0 bottom-3 text-center text-sm text-white'>
              {STATUS_MESSAGE.starting}
            </p>
          )}
        </div>
      ) : (
        <p className='rounded-lg bg-muted px-4 py-6 text-center text-sm text-text-subtle'>
          {STATUS_MESSAGE[status]}
        </p>
      )}

      <div className='space-y-2'>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={handlePhoto}
        />
        <Button
          type='button'
          variant='outline'
          className='w-full'
          loading={isReadingPhoto}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp aria-hidden />
          사진에서 읽기
        </Button>
        {photoMessage && (
          <p role='alert' className='text-center text-sm text-destructive'>
            {photoMessage}
          </p>
        )}
        <p className='text-center text-xs text-text-subtle'>
          PC 에서는 바코드 리더기로 찍거나, 검색창에 ISBN 숫자를 입력해도 돼요.
        </p>
      </div>
    </>
  );
};

'use client';

import { useRef, useState } from 'react';

import Image from 'next/image';

import { Maximize2, Minus, Plus, X } from 'lucide-react';

import type { StoryImage } from '@/entities/story';

type CharacterMapProps = {
  full: StoryImage;
  cards: StoryImage[];
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

/**
 * 인물관계도 — PC 는 원본 1장, 모바일은 카드(있으면) 세로 나열. 누르면 크게 보기.
 *
 * 이 페이지에서 브라우저 JS 가 필요한 건 "크게 보기" 하나뿐이라 이 컴포넌트만 클라이언트다.
 * 그림과 alt 는 서버 HTML 에 그대로 들어가므로(클라이언트 컴포넌트도 처음엔 서버에서 그린다)
 * 이미지 검색에는 영향이 없다.
 *
 * - 확대 창은 <dialog>: ESC 닫기·포커스 가두기·배경 막기를 브라우저가 해 준다(라이브러리 불필요)
 * - 모바일 확대는 손가락 핀치(브라우저 기본)에 맡기고, PC 는 +/− 버튼
 * - 이미지는 미리 줄인 webp 를 그대로 쓴다(unoptimized) — Vercel 이미지 변환 한도를 쓰지 않는다
 */
export const CharacterMap = ({ full, cards }: CharacterMapProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);

  const open = () => {
    // 화면 폭에 딱 맞춰 시작한다(PC 는 원본 크기까지만). 좌우 여백 p-4 = 32px
    const fit = (window.innerWidth - 32) / full.width;
    setZoom(Math.max(ZOOM_MIN, Math.min(1, fit)));
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const hasCards = cards.length > 0;

  return (
    <>
      {/* 원본 1장 — 카드가 있으면 PC 에서만, 없으면 모든 화면에서 */}
      <button
        type='button'
        onClick={open}
        className={`group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${hasCards ? 'max-md:hidden' : ''}`}
        aria-label='인물관계도 크게 보기'
      >
        <Image
          src={full.src}
          width={full.width}
          height={full.height}
          alt={full.alt}
          sizes='(min-width: 768px) 720px, 100vw'
          className='h-auto w-full'
          unoptimized
          priority
        />
        <span className='absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-text-strong/80 px-3 py-1.5 text-xs text-background'>
          <Maximize2 aria-hidden='true' className='size-3.5' />
          크게 보기
        </span>
      </button>

      {hasCards && (
        <div className='flex flex-col gap-4 md:hidden'>
          {cards.map((card, index) => (
            <figure key={card.src} className='flex flex-col gap-1.5'>
              <Image
                src={card.src}
                width={card.width}
                height={card.height}
                alt={card.alt}
                sizes='100vw'
                className='h-auto w-full rounded-xl border border-line'
                unoptimized
              />
              <figcaption className='text-xs text-text-subtle'>
                {index + 1} / {cards.length}
              </figcaption>
            </figure>
          ))}
          <button
            type='button'
            onClick={open}
            className='rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-text-strong'
          >
            한 장으로 전체 보기
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-label='인물관계도 크게 보기'
        className='m-auto h-dvh max-h-dvh w-screen max-w-none bg-background p-0 text-text-strong backdrop:bg-black/70 md:h-[90dvh] md:w-[min(1200px,95vw)] md:rounded-xl'
        // 배경(창 바깥)을 누르면 닫는다 — dialog 자신이 클릭 대상일 때가 바깥이다
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-between gap-2 border-b border-line px-3 py-2'>
            <span className='truncate text-sm text-text-subtle'>
              인물관계도
            </span>
            <div className='flex items-center gap-1'>
              <button
                type='button'
                onClick={() =>
                  setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))
                }
                disabled={zoom <= ZOOM_MIN}
                aria-label='작게'
                className='grid size-9 place-items-center rounded-lg border border-line disabled:opacity-40'
              >
                <Minus aria-hidden='true' className='size-4' />
              </button>
              <button
                type='button'
                onClick={() =>
                  setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))
                }
                disabled={zoom >= ZOOM_MAX}
                aria-label='크게'
                className='grid size-9 place-items-center rounded-lg border border-line disabled:opacity-40'
              >
                <Plus aria-hidden='true' className='size-4' />
              </button>
              <button
                type='button'
                onClick={close}
                aria-label='닫기'
                className='grid size-9 place-items-center rounded-lg border border-line'
              >
                <X aria-hidden='true' className='size-4' />
              </button>
            </div>
          </div>
          {/* touch-action: 이 칸 안에서는 핀치 확대·스크롤을 브라우저에 맡긴다 */}
          <div className='flex-1 touch-pan-x touch-pan-y touch-pinch-zoom overflow-auto p-4'>
            <Image
              src={full.src}
              width={full.width}
              height={full.height}
              alt=''
              unoptimized
              className='mx-auto h-auto max-w-none'
              style={{ width: full.width * zoom }}
            />
          </div>
        </div>
      </dialog>
    </>
  );
};

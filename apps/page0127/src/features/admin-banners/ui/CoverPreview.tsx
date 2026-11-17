'use client';

import { type PointerEvent, useRef } from 'react';

import type { SlideFields } from '@/features/admin-banners/api/slideActions';

/** 홈 표지 기본값 — AboutHero.module.css 의 --cover/--cover-ink/--belt 와 같다 */
const DEFAULT_COVER = { bg: '#0969e0', fg: '#fbf1e6' };
const DEFAULT_BELT = {
  eyebrow: '2026 독서 기록 서비스',
  head: '“읽은 책이 쌓이면,\n책장이 나를 소개한다”',
  foot: '한 권을 꽂는 순간, 당신의 서재가 시작됩니다',
  bg: '#f6efe2',
  fg: '#14294e',
};

type CoverPreviewProps = {
  fields: SlideFields;
  /** 그림을 끌어 옮기면 표지 기준 % 로 알려 준다 */
  onMoveArt: (x: number, y: number) => void;
  disabled?: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 홈 앞표지 미리보기 — 실제 표지와 같은 비율(0.7)·배치(띠지 아래 31%)를 작게 그린다.
 *
 * 그림은 끌어서 옮길 수 있다. 위치는 픽셀이 아니라 표지 기준 % 로 저장하므로
 * 이 작은 미리보기에서 맞춘 자리가 홈의 큰 표지에서도 같은 자리다.
 */
export const CoverPreview = ({
  fields,
  onMoveArt,
  disabled,
}: CoverPreviewProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const isCustomCover = fields.cover_style === 'custom';
  const coverBg = isCustomCover ? fields.cover_bg : DEFAULT_COVER.bg;
  const coverFg = isCustomCover ? fields.cover_fg : DEFAULT_COVER.fg;
  const showNumber = !isCustomCover || fields.show_number;
  const title =
    isCustomCover && fields.cover_title.trim()
      ? fields.cover_title
      : '읽은 책을 꽂아 두면,\n책장이 취향을 말해 줍니다';
  const isCustomBelt = fields.belt_style === 'custom';
  const belt = isCustomBelt
    ? {
        eyebrow: fields.eyebrow,
        head: `${fields.line1}\n${fields.line2}`,
        foot: `${fields.sub} →`,
        bg: fields.bg,
        fg: fields.fg,
      }
    : DEFAULT_BELT;

  // 끄는 동안 포인터를 붙잡아 두어 미리보기 밖으로 나가도 계속 따라오게 한다
  const moveTo = (e: PointerEvent) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMoveArt(
      round1(Math.min(100, Math.max(0, x))),
      round1(Math.min(100, Math.max(0, y)))
    );
  };

  return (
    <div
      ref={frameRef}
      className='relative isolate overflow-hidden rounded-r-md shadow-md'
      style={{
        width: 210,
        aspectRatio: '0.7',
        background: coverBg,
        color: coverFg,
        padding: '9% 9% 0 13%',
        fontSize: 210 * 0.063,
      }}
    >
      {isCustomCover && fields.art_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fields.art_url}
          alt='표지 그림 — 끌어서 옮기기'
          draggable={false}
          onPointerDown={(e) => {
            if (disabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e);
          }}
          className='absolute -z-10 h-auto cursor-move touch-none select-none'
          style={{
            left: `${fields.art_x}%`,
            top: `${fields.art_y}%`,
            width: `${fields.art_w}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
      {showNumber && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute font-extrabold'
          style={{
            left: '11%',
            bottom: '29%',
            fontSize: 210 * 0.36,
            lineHeight: 0.8,
            letterSpacing: '-0.06em',
            color: `color-mix(in srgb, ${coverBg} 92%, #000)`,
          }}
        >
          0127.
        </span>
      )}
      <p
        className='relative whitespace-pre-line font-bold'
        style={{ lineHeight: 1.42, wordBreak: 'keep-all' }}
      >
        {title}
      </p>
      <div
        className='absolute inset-x-0 bottom-0 flex flex-col justify-center gap-0.5'
        style={{
          height: '31%',
          padding: '0 22% 0 13%',
          background: belt.bg,
          color: belt.fg,
        }}
      >
        <span className='text-[7px] font-bold tracking-widest opacity-80'>
          {belt.eyebrow}
        </span>
        <span className='whitespace-pre-line text-[10px] font-extrabold leading-tight'>
          {belt.head}
        </span>
        <span className='text-[7px] opacity-80'>{belt.foot}</span>
      </div>
    </div>
  );
};

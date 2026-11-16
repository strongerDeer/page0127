'use client';

import { type ReactNode, type SyntheticEvent, useState } from 'react';

import Image, { type ImageProps } from 'next/image';

import { isPreOptimizedImageSrc } from '../lib/imageOptimization';
import {
  parseYes24CoverItemId,
  toYes24CoverBase,
  yes24CoverLoader,
  yes24LargeCoverLoader,
  yes24SmallCoverLoader,
} from '../lib/yes24CoverLoader';

type CoverImageProps = Omit<
  ImageProps,
  'src' | 'loader' | 'unoptimized' | 'onError'
> & {
  /** 표지 주소. 비어 있으면 곧장 fallback 을 그린다 */
  src: string | null | undefined;
  /** src 를 불러오지 못했을 때 대신 쓸 주소 (예: Storage 사본) */
  fallbackSrc?: string | null;
  /** 상세처럼 표지 한 장을 크게 놓는 자리. YES24 XL(~250KB)까지 허용한다 */
  large?: boolean;
  /**
   * 띠·목록 썸네일처럼 표지를 작게(CSS 128px 이하) 놓는 자리. 고밀도 화면에서도 YES24 M 만 받는다.
   * large 와 함께 주면 large 가 이긴다.
   */
  small?: boolean;
  /** 후보 주소가 모두 실패했을 때 그릴 것. 기본은 아무것도 그리지 않는다 */
  fallback?: ReactNode;
};

/**
 * 책 표지 이미지 — 최적화 경로와 실패 시 대체만 책임진다(모양은 호출부 몫)
 *
 * BookCover 는 이 위에 도메인 셰이프와 제목 조판을 얹은 것이다. 표지를 원본 판형
 * 그대로 세워야 하는 자리(랜딩 배너, 책장)는 BookCover 대신 이걸 직접 쓴다.
 *
 * 왜 next/image 를 바로 쓰지 않는가: 아래 두 규칙을 화면마다 다시 적으면 한 곳은
 * 반드시 빠진다(실제로 2026-08 에 두 번 빠져서 이미지가 사라졌다).
 * - YES24 표지는 크기별 사본을 고르는 loader, 그 밖의 원격 이미지는 변환 안 함
 * - src 가 실패하면 fallbackSrc, 그것도 실패하면 fallback
 */
export const CoverImage = ({
  src: srcProp,
  fallbackSrc,
  large = false,
  small = false,
  fallback = null,
  alt,
  onLoad,
  ...rest
}: CoverImageProps) => {
  // 불러오다 실패한 주소들. 주소 자체를 기억하므로 src 가 바뀌면 자연히 새로 시도한다.
  const [failedSrcs, setFailedSrcs] = useState<string[]>([]);
  // 가로로 넓은 판형으로 확인된 주소. 주소로 기억하므로 src 가 바뀌면 자연히 풀린다.
  const [wideSrc, setWideSrc] = useState<string | null>(null);
  const src = pickCoverSrc([srcProp, fallbackSrc], failedSrcs);

  if (!src) return <>{fallback}</>;

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    if (isWideCover(event.currentTarget)) setWideSrc(src);
    onLoad?.(event);
  };

  return (
    <Image
      {...rest}
      {...toCoverImageProps(src, large ? 'large' : small ? 'small' : 'default')}
      alt={alt}
      // CSS(.book-cover-fit[data-wide])가 이 표시를 보고 너비 상한을 건다
      data-wide={wideSrc === src || undefined}
      onLoad={handleLoad}
      onError={() => setFailedSrcs((prev) => [...prev, src])}
    />
  );
};

/**
 * 세로/가로 비율이 이보다 작으면 "가로로 넓은 표지"로 본다.
 *
 * 표지 슬롯은 1:1.45 이고 이미지는 높이를 슬롯에 맞춘다(.book-cover-fit). 그러면
 * 이미지 너비 = 슬롯 너비 × (1.45 ÷ 비율). 이 값이 슬롯의 120% 를 넘는 지점이
 * 1.45 ÷ 1.2 ≈ 1.2 다. YES24 보통 판형(1.28~1.76)은 여기 걸리지 않는다.
 * 걸리는 책은 『비즈니스 모델의 탄생』처럼 가로가 더 긴 판형이다(약 0.8 → 너비 180%).
 */
const WIDE_COVER_RATIO = 1.2;

/**
 * 불러온 이미지가 가로로 넓은 판형인지.
 *
 * CSS 로는 이미지의 원본 비율을 읽을 수 없어서 load 시점에 JS 로 잰다.
 * naturalWidth/Height 는 srcset 밀도로 나뉜 값일 수 있지만 비율은 그대로다.
 */
export const isWideCover = ({
  naturalWidth,
  naturalHeight,
}: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight'>): boolean =>
  naturalWidth > 0 && naturalHeight / naturalWidth < WIDE_COVER_RATIO;

/**
 * 후보 주소 중 아직 실패하지 않은 첫 번째를 고른다. 없으면 null(→ fallback).
 *
 * 빈 문자열·null 은 후보가 아니다. 같은 주소가 두 번 들어와도(src 와 fallbackSrc 가
 * 같은 경우) 한 번 실패하면 둘 다 건너뛴다.
 */
export const pickCoverSrc = (
  candidates: ReadonlyArray<string | null | undefined>,
  failed: ReadonlyArray<string>
): string | null =>
  candidates.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' &&
      candidate !== '' &&
      !failed.includes(candidate)
  ) ?? null;

const YES24_LOADERS = {
  small: yes24SmallCoverLoader,
  default: yes24CoverLoader,
  large: yes24LargeCoverLoader,
} as const;

/**
 * 주소에 맞는 최적화 경로를 고른다.
 *
 * - YES24 앞표지 → 크기별 사본을 고르는 loader(큰 자리만 XL, 작은 자리는 M 고정).
 *   크기를 뗀 주소를 넘기는 이유는 `toYes24CoverBase` 주석 참고.
 * - 이미 완성된 원격 이미지(Storage 사본 등) → Vercel 변환을 태우지 않는다(unoptimized).
 * - 그 밖(로컬 정적 이미지) → 기본 최적화.
 */
const toCoverImageProps = (
  src: string,
  size: 'small' | 'default' | 'large'
): Pick<ImageProps, 'src' | 'loader' | 'unoptimized'> => {
  const yes24ItemId = parseYes24CoverItemId(src);
  if (yes24ItemId) {
    return {
      src: toYes24CoverBase(yes24ItemId),
      loader: YES24_LOADERS[size],
    };
  }
  return { src, unoptimized: isPreOptimizedImageSrc(src) };
};

'use client';

import { type ReactNode, useState } from 'react';

import Image, { type ImageProps } from 'next/image';

import { isPreOptimizedImageSrc } from '../lib/imageOptimization';
import {
  parseYes24CoverItemId,
  toYes24CoverBase,
  yes24CoverLoader,
  yes24LargeCoverLoader,
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
  fallback = null,
  alt,
  ...rest
}: CoverImageProps) => {
  // 불러오다 실패한 주소들. 주소 자체를 기억하므로 src 가 바뀌면 자연히 새로 시도한다.
  const [failedSrcs, setFailedSrcs] = useState<string[]>([]);
  const src = pickCoverSrc([srcProp, fallbackSrc], failedSrcs);

  if (!src) return <>{fallback}</>;

  return (
    <Image
      {...rest}
      {...toCoverImageProps(src, large)}
      alt={alt}
      onError={() => setFailedSrcs((prev) => [...prev, src])}
    />
  );
};

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

/**
 * 주소에 맞는 최적화 경로를 고른다.
 *
 * - YES24 앞표지 → 크기별 사본을 고르는 loader(큰 자리만 XL 허용). 크기를 뗀
 *   주소를 넘기는 이유는 `toYes24CoverBase` 주석 참고.
 * - 이미 완성된 원격 이미지(Storage 사본 등) → Vercel 변환을 태우지 않는다(unoptimized).
 * - 그 밖(로컬 정적 이미지) → 기본 최적화.
 */
const toCoverImageProps = (
  src: string,
  large: boolean
): Pick<ImageProps, 'src' | 'loader' | 'unoptimized'> => {
  const yes24ItemId = parseYes24CoverItemId(src);
  if (yes24ItemId) {
    return {
      src: toYes24CoverBase(yes24ItemId),
      loader: large ? yes24LargeCoverLoader : yes24CoverLoader,
    };
  }
  return { src, unoptimized: isPreOptimizedImageSrc(src) };
};

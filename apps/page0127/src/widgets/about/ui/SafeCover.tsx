'use client';

import { useState } from 'react';

import Image from 'next/image';

import { isPreOptimizedImageSrc } from '@repo/ui';

type SafeCoverProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

/**
 * 불러오지 못한 표지는 칸째로 사라진다.
 *
 * 소개 페이지의 표지는 장식이라 "이미지 없음" 대체 그림을 보여 줄 이유가 없다 —
 * 깨진 아이콘이 줄지어 있는 것보다 그 자리를 비우는 편이 낫다.
 * (운영에서도 원본 주소가 죽은 표지가 섞일 수 있다. 로컬에서는 운영 저장소 주소가
 *  CSP 에 막혀 같은 상황이 재현된다.)
 */
export const SafeCover = ({
  src,
  alt,
  width,
  height,
  className,
}: SafeCoverProps) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized={isPreOptimizedImageSrc(src)}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

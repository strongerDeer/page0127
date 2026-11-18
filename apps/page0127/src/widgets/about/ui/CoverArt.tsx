import type { HeroCoverArt } from '@/entities/banner/types';

import styles from './AboutHero.module.css';

/**
 * 기념일 표지 그림 — 어드민에서 올린 그림을 표지 위 % 위치·크기로 놓는다.
 *
 * - 위치(x·y)는 그림 **가운데 점**이 표지의 몇 % 에 오는지. 표지 크기가 화면마다 달라도 같은 자리에 선다.
 * - next/image 를 안 쓰는 이유: 어드민이 이미 600px WEBP 로 줄여 올린 파일이라 변환 함수를
 *   거칠 필요가 없다(Vercel 이미지 변환 한도·CPU 절약). 그래서 이 파일은 최적화 판정 검사 대상도 아니다.
 * - 장식이라 alt 는 비운다. 첫 화면이지만 제목 글자가 LCP 여야 하므로 우선순위를 낮춘다.
 */
export const CoverArt = ({ art }: { art: HeroCoverArt }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={art.url}
    alt=''
    aria-hidden='true'
    decoding='async'
    fetchPriority='low'
    className={styles.art}
    style={{ left: `${art.x}%`, top: `${art.y}%`, width: `${art.w}%` }}
  />
);

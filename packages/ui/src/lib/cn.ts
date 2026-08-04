import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind 클래스 병합 유틸리티
 *
 * - clsx: 조건부 클래스 결합
 * - twMerge: 나중에 온 클래스가 앞의 같은 축을 이기게 한다
 *   (`px-4` 뒤에 `px-2` 가 오면 `px-2` 만 남는다)
 *
 * 호출부가 `className` 으로 컴포넌트 기본 스타일을 덮을 수 있는 근거가 이것이다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

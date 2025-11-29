import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 클래스 병합 유틸리티
 *
 * 학습 포인트:
 * - clsx: 조건부 클래스 결합
 * - twMerge: Tailwind 클래스 충돌 해결
 * - shadcn/ui에서 기본 제공하는 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { notFound } from 'next/navigation';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { isDemoUser } from '@/shared/lib/demo/demoAccount';

/**
 * 데모 어드민 문지기 — 체험 계정으로 로그인한 사람만 통과, 나머지(비로그인·일반 회원·관리자)는 404.
 *
 * 보여 주는 숫자는 전부 예시라 새도 문제는 없지만, 아무나 열면 "page0127. 숫자가 이렇다"로 오해받는다.
 * 실제 어드민처럼 레이아웃과 각 페이지에서 둘 다 부른다 — Next 는 레이아웃과 페이지를 병렬로
 * 그려서 레이아웃의 notFound() 만으로는 페이지 조각이 응답에 실리는 걸 못 막는다.
 * getCurrentUser 는 React cache 라 같은 요청에서 여러 번 불러도 인증 확인은 한 번이다.
 */
export const assertDemoViewer = async (): Promise<void> => {
  const user = await getCurrentUser();
  if (!isDemoUser(user)) notFound();
};

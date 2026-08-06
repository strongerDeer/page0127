import { apiClient } from '@/shared/api/client';

/**
 * 배너 클릭을 센다. **응답을 기다리지 않는다.**
 *
 * 이 호출은 사용자가 링크를 따라 떠나는 순간에 일어난다. await 하면 이동이
 * 그만큼 늦어지고, 집계가 실패하면 이동 자체가 막힐 수도 있다. 이 숫자는
 * 어드민이 눈으로 비교하는 참고값이라 몇 건 놓쳐도 된다 — 사용자 흐름이 우선이다.
 *
 * 페이지를 떠나는 중이라 요청이 잘릴 수 있다. 그래서 실패를 조용히 삼킨다 —
 * 콘솔에 남기면 정상적인 이탈이 매번 에러로 보인다.
 */
export const countBannerClick = (slideId: string): void => {
  void apiClient.post(`/banners/${slideId}/click`).catch(() => {});
};

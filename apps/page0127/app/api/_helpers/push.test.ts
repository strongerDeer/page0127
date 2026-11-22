import { expect, test } from 'vitest';
import { sendNotification, setVapidDetails } from 'web-push';

/**
 * push.ts 가 기대는 web-push 의 공개 API 계약.
 *
 * web-push 는 타입(@types/web-push)과 실제 패키지 버전이 따로 올라가서,
 * 타입 체크만으로는 "런타임에 함수가 실제로 있는가"를 보장하지 못한다.
 * (4.0 에서 default export 가 사라졌는데 타입은 3.x 라 빌드가 통과했던 장애, 2026-11-22)
 * 메이저 업데이트 PR 에서 이 테스트가 먼저 깨지도록 실제 모듈을 불러와 확인한다.
 */
test('web-push 는 push.ts 가 쓰는 함수를 named export 로 제공한다', () => {
  expect(typeof setVapidDetails).toBe('function');
  expect(typeof sendNotification).toBe('function');
});

'use client';

import { useEffect } from 'react';

import { ADMIN_DEVICE_KEY } from './GoogleAnalytics';

/**
 * 이 브라우저를 "관리자 기기"로 표시한다 — 이후 GA 전송이 꺼진다(GoogleAnalytics 의 ga-init 참고).
 *
 * 로그인 여부로 판단하지 않는 이유: 루트 레이아웃에서 세션을 읽으면 모든 페이지가
 * 요청마다 새로 렌더링되는(동적) 페이지로 바뀐다. 대신 /admin 을 한 번 연 브라우저에
 * 표시를 남기고, GA 스크립트가 브라우저 안에서만 확인한다.
 * 로그아웃해도 표시는 남는다 — 지우려면 개발자도구 > Application > Local Storage 에서 삭제.
 */
export const MarkAdminDevice = () => {
  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_DEVICE_KEY, '1');
    } catch {
      // 시크릿 창 등 저장소가 막힌 환경 — 표시 없이 넘어간다
    }
  }, []);

  return null;
};

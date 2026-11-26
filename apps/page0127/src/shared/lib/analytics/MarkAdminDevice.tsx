'use client';

import { useEffect } from 'react';

import { ADMIN_DEVICE_KEY } from './GoogleAnalytics';

/**
 * 이 브라우저를 "운영자 기기"로 표시한다 — 이후 GA 전송이 꺼지고 Clarity 가 붙지 않는다
 * (GoogleAnalytics 의 ga-init, MicrosoftClarity 의 clarity-init 참고).
 *
 * 표시를 남기는 곳은 두 군데다.
 * - /admin 을 연 브라우저(아래 MarkAdminDevice 컴포넌트)
 * - 관리자·테스트 계정으로 로그인한 브라우저(widgets/visit/RecordingExclusionReporter)
 *
 * 로그인 여부를 서버에서 판단하지 않는 이유: 루트 레이아웃에서 세션을 읽으면 모든 페이지가
 * 요청마다 새로 렌더링되는(동적) 페이지로 바뀐다. 대신 브라우저에 표시를 남기고,
 * 분석 스크립트가 브라우저 안에서만 확인한다.
 * 로그아웃해도 표시는 남는다 — 지우려면 개발자도구 > Application > Local Storage 에서 삭제.
 */
export const markAdminDevice = (): void => {
  try {
    localStorage.setItem(ADMIN_DEVICE_KEY, '1');
  } catch {
    // 시크릿 창 등 저장소가 막힌 환경 — 표시 없이 넘어간다
  }
};

/** 이미 운영자 기기로 표시된 브라우저인가 */
export const isAdminDevice = (): boolean => {
  try {
    return localStorage.getItem(ADMIN_DEVICE_KEY) === '1';
  } catch {
    return false;
  }
};

export const MarkAdminDevice = () => {
  useEffect(() => {
    markAdminDevice();
  }, []);

  return null;
};

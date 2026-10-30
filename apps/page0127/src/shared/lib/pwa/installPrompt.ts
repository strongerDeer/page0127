'use client';

import { useSyncExternalStore } from 'react';

/**
 * 크롬·엣지(안드로이드·PC)의 "설치하기" 창을 우리 버튼으로 띄우기 위한 저장소.
 *
 * 브라우저는 설치 조건(매니페스트·서비스워커)이 맞으면 페이지가 뜨자마자
 * `beforeinstallprompt` 를 **한 번** 보낸다. 안내 창이 열릴 때 듣기 시작하면 이미 지나간
 * 뒤라 버튼을 띄울 수 없다. 그래서 이 모듈이 로드되는 순간(루트 레이아웃의
 * ServiceWorkerRegistrar 가 import) 받아 두었다가, 누르는 순간 prompt() 를 부른다.
 *
 * 사파리·파이어폭스에는 이 이벤트가 없다 — 그땐 null 이고 안내 문구로 대신한다.
 */

/** 표준 타입에 아직 없다 (크롬 전용) */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // 브라우저 기본 미니 배너 대신 우리 버튼으로 띄운다
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * 설치 창을 띄울 수 있으면 promptInstall 을, 없으면 null 을 준다.
 * 한 번 띄운 이벤트는 다시 쓸 수 없어서(브라우저 규칙) 띄우고 나면 비운다.
 */
export const useInstallPrompt = () => {
  const event = useSyncExternalStore(
    subscribe,
    () => deferred,
    () => null
  );
  if (!event) return null;

  return async (): Promise<'accepted' | 'dismissed'> => {
    deferred = null;
    notify();
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  };
};

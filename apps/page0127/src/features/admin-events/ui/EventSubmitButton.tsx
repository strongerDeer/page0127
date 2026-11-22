'use client';

import { useFormStatus } from 'react-dom';

/**
 * 운영 기록 "기록" 버튼 — 저장하는 동안 잠가서 연타로 같은 기록이 두 번 들어가는 걸 막는다.
 *
 * 왜 따로 뺐나:
 * - AdminEventsPanel 은 서버 컴포넌트라 훅을 못 쓴다 → 버튼만 클라이언트 컴포넌트로 분리
 * - useFormStatus 는 "부모 <form>"의 제출 상태를 읽으므로 반드시 form 안에서 렌더돼야 한다
 *
 * 한계: UI 잠금이라 탭 두 개에서 동시에 누르거나 하이드레이션 전에 제출하는 경우까지는 못 막는다.
 * (DB unique 제약은 어드민 전용 메모라 이번엔 넣지 않음 — 2026-11-22 HJ 결정)
 */
export const EventSubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <button
      type='submit'
      disabled={pending}
      aria-busy={pending}
      className='rounded border border-line px-3 py-1 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'
    >
      {pending ? '기록 중…' : '기록'}
    </button>
  );
};

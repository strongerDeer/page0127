'use client';

import { useEffect, useState } from 'react';

import { cn } from '@repo/ui';
import { Maximize2, X } from 'lucide-react';

/** 관계도를 그리는 기준 폭 — PC 본문 폭에 맞춘 값. 좁은 화면은 이 그림을 통째로 줄인다 */
export const DIAGRAM_WIDTH = 720;

/**
 * 컨테이너 폭에 따라 그림을 줄이는 단계 — zoom × 720 이 그 폭을 넘지 않게 고른 값.
 * (calc(100cqw / 720px) 처럼 길이끼리 나누는 CSS 는 아직 브라우저 지원이 고르지 않아 단계로 둔다)
 */
const fitZoom =
  '[zoom:0.4] @min-[346px]:[zoom:0.48] @min-[400px]:[zoom:0.55] @min-[480px]:[zoom:0.66] @min-[560px]:[zoom:0.77] @min-[640px]:[zoom:0.88] @min-[720px]:[zoom:1]';

/**
 * 관계도 확대 보기 — 모바일·PC 가 같은 그림을 쓰고, 좁으면 줄여 보여 주다가 누르면 원래 크기로 펼친다.
 *
 * 왜 클라이언트 컴포넌트인가: 펼침 상태(열림/닫힘)만 브라우저에서 바꾼다.
 * 그림(children)은 서버 컴포넌트가 그린 HTML 이 그대로 들어온다 — 이 파일은 상태와 버튼만 가진다.
 * DOM 은 하나라 검색엔진에게 같은 글이 두 번 보이지 않는다(복제해서 모달에 넣지 않는 이유).
 */
export const ZoomableDiagram = ({
  label,
  children,
}: {
  /** 펼침 버튼·닫기 버튼의 접근성 이름에 쓰는 관계도 제목 */
  label: string;
  children: React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    // 펼친 동안 뒤 페이지가 같이 스크롤되지 않게 + Esc 로 닫기
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  return (
    <div
      className={cn(
        expanded
          ? 'fixed inset-0 z-50 overflow-auto bg-card p-4 pt-16'
          : 'flex flex-col @container'
      )}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded || undefined}
      aria-label={expanded ? `${label} 크게 보기` : undefined}
    >
      <div
        style={{ width: DIAGRAM_WIDTH }}
        className={cn('flex flex-col gap-4', expanded ? 'mx-auto' : fitZoom)}
      >
        {children}
      </div>

      {expanded && (
        // 펼친 화면 위쪽에 고정 — 그림이 화면보다 넓어 오른쪽 끝이 잘려 보여도 안내가 늘 보이게
        <p className='fixed top-0 right-0 left-0 flex h-16 bg-card pr-16 items-center px-4 text-xs text-text-subtle'>
          옆으로 밀거나 두 손가락으로 확대해서 보세요.
        </p>
      )}
      {expanded ? (
        <button
          type='button'
          onClick={() => setExpanded(false)}
          aria-label='닫기'
          className='fixed top-3 right-3 flex size-10 items-center justify-center rounded-full bg-sunken text-text-strong'
        >
          <X aria-hidden='true' className='size-5' />
        </button>
      ) : (
        // 그림 아래 오른쪽 — 줄여 보이는 화면에서만. 720px 이상이면 이미 원래 크기라 숨긴다
        <button
          type='button'
          onClick={() => setExpanded(true)}
          aria-label={`${label} 크게 보기`}
          className='mt-3 ml-auto flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-text-body ring-1 ring-line @min-[720px]:hidden'
        >
          <Maximize2 aria-hidden='true' className='size-3.5' />
          크게 보기
        </button>
      )}
    </div>
  );
};

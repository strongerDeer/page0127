'use client';

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { useWindowVirtualizer } from '@tanstack/react-virtual';

type VirtualShelfRowsProps = {
  /** 단마다 들어갈 항목 순번 (packShelfRows 결과) */
  rows: number[][];
  /** 한 단의 반복 높이 = li 높이 + 단 간격 */
  rowHeight: number;
  /** 마지막 단 아래에는 간격이 없다 */
  rowGap: number;
  /** 단 하나(ul)에 붙일 클래스 — 기존 `.books` 스타일을 그대로 쓴다 */
  rowClassName: string;
  renderItem: (index: number) => ReactNode;
};

/**
 * 책장 가상화 — 화면에 보이는 단(과 위아래 2단)만 실제로 그린다.
 *
 * 학습 포인트:
 * - **창 스크롤 가상화(useWindowVirtualizer)**: 책장은 따로 스크롤 상자가 없고 페이지가
 *   스크롤된다. 그래서 "책장이 페이지 위에서 몇 px 떨어져 있나"(scrollMargin)를 알아야
 *   지금 몇 번째 단이 보이는지 계산할 수 있다.
 * - **전체 높이는 미리 잡는다**: 안 그린 단도 자리는 차지해야 스크롤바 길이와 선반 배경
 *   (280px 반복 그라디언트)이 그대로다. 그래서 바깥 상자에 단 수 × 단 높이를 준다.
 * - **SSR**: 서버에는 창이 없다. initialRect 로 "보통 화면 크기"를 가정해 첫 몇 단은
 *   서버 HTML 에도 들어가게 한다 — 첫 화면이 빈 선반으로 깜빡이지 않는다.
 */
export const VirtualShelfRows = ({
  rows,
  rowHeight,
  rowGap,
  rowClassName,
  renderItem,
}: VirtualShelfRowsProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // 책장 윗부분(프로필·통계 카드)의 높이가 바뀌면 책장 시작 위치도 바뀐다 → 다시 잰다
  useLayoutEffect(() => {
    const measure = () => {
      const top = listRef.current?.getBoundingClientRect().top ?? 0;
      setScrollMargin(Math.round(top + window.scrollY));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    overscan: 2,
    scrollMargin,
    initialRect: { width: 1280, height: 900 },
  });

  return (
    <div
      ref={listRef}
      style={{
        position: 'relative',
        height: Math.max(0, rows.length * rowHeight - rowGap),
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <ul
          key={virtualRow.key}
          className={rowClassName}
          data-align='center'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            // 단 안에서는 줄바꿈하지 않는다 — 넘치지 않게 나누는 건 packShelfRows 몫
            flexWrap: 'nowrap',
            transform: `translateY(${virtualRow.start - scrollMargin}px)`,
          }}
        >
          {rows[virtualRow.index].map(renderItem)}
        </ul>
      ))}
    </div>
  );
};

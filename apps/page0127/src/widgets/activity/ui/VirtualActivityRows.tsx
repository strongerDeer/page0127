'use client';

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { ActivityCard } from './ActivityCard';

import type { Activity } from '@/entities/activity';

type VirtualActivityRowsProps = {
  activities: Activity[];
  hideBook?: boolean;
  initialCommentsOpen?: boolean;
  /** 끝에서 몇 장 앞까지 그려지면 부른다 — 다음 페이지 불러오기 */
  onReachEnd: () => void;
};

/** 카드 높이 어림값. 실제 높이는 그린 뒤 measureElement 로 재서 바로잡는다 */
const ESTIMATED_CARD_HEIGHT = 260;
/** 화면 위아래로 몇 장을 더 그려 둘지 — 빠르게 넘길 때 빈칸이 보이지 않게 */
const OVERSCAN = 4;
/** 마지막에서 몇 장 앞이 그려지면 다음 페이지를 부를지 */
const LOAD_MORE_THRESHOLD = 3;

/**
 * 활동 카드 가상화 — 화면 근처 카드만 실제로 그린다.
 *
 * 학습 포인트:
 * - **높이가 제각각인 목록**: 책장(고정 280px)과 달리 감상 길이·댓글 펼침에 따라 카드 높이가
 *   다르다. 그래서 어림값(estimateSize)으로 먼저 자리를 잡고, 그린 카드는
 *   measureElement(ResizeObserver)로 실제 높이를 재서 바꾼다. 댓글을 펼쳐 카드가 커져도
 *   아래 카드들이 알아서 밀린다.
 * - **다음 페이지 신호**: 예전엔 목록 맨 아래 감시 div(IntersectionObserver)가 보이면 불렀다.
 *   가상화하면 목록 전체 높이가 어림값으로 미리 잡혀 감시 div 가 "계속 보이는" 상태로 남을 수
 *   있어 신호가 다시 오지 않는다. 그래서 "지금 그린 마지막 카드 순번"으로 판단한다.
 * - **'use no memo'**: virtualizer 는 같은 객체를 돌려주고 안쪽 값만 바꾼다. React Compiler 가
 *   getVirtualItems()·getTotalSize() 결과를 재사용하지 않도록 이 컴포넌트는 자동 메모에서 뺀다.
 * - **알고 쓰는 손해**: 화면에서 멀어진 카드는 사라졌다가 다시 그려진다. 그 카드의 댓글 펼침·
 *   쓰다 만 댓글은 초기화된다(서버 데이터인 좋아요·댓글 수는 react-query 캐시라 그대로).
 */
export const VirtualActivityRows = ({
  activities,
  hideBook,
  initialCommentsOpen,
  onReachEnd,
}: VirtualActivityRowsProps) => {
  'use no memo';
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // 목록 위(헤더·탭)의 높이가 바뀌면 목록 시작 위치도 바뀐다 → 다시 잰다
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
    count: activities.length,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: OVERSCAN,
    scrollMargin,
    getItemKey: (index) => activities[index].id,
  });
  const items = virtualizer.getVirtualItems();
  const lastRenderedIndex = items.at(-1)?.index ?? -1;

  const reachEnd = useEffectEvent(onReachEnd);
  useEffect(() => {
    if (lastRenderedIndex >= activities.length - LOAD_MORE_THRESHOLD) {
      reachEnd();
    }
  }, [lastRenderedIndex, activities.length]);

  // 그린 카드 묶음을 첫 카드 위치로 한 번에 옮긴다 — 카드마다 absolute 를 주면
  // 부모의 divide-y(카드 사이 구분선)가 그대로 먹고, 측정도 흐름 레이아웃 그대로다.
  const offset = (items[0]?.start ?? 0) - scrollMargin;

  return (
    <div
      ref={listRef}
      className='relative border-t border-line'
      style={{ height: virtualizer.getTotalSize() }}
    >
      <div
        className='absolute inset-x-0 top-0 divide-y divide-line-soft'
        style={{ transform: `translateY(${offset}px)` }}
      >
        {items.map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
          >
            <ActivityCard
              activity={activities[item.index]}
              hideBook={hideBook}
              initialCommentsOpen={initialCommentsOpen}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

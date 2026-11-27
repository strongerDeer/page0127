'use client';

import { useState, useTransition } from 'react';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';

import {
  createSlide,
  reorderSlides,
} from '@/features/admin-banners/api/slideActions';
import { SlideCard } from '@/features/admin-banners/ui/SlideCard';

import type { HeroSlideRow } from '@/entities/banner/types';

export const BannerManager = ({ initial }: { initial: HeroSlideRow[] }) => {
  const [slides, setSlides] = useState(initial);

  // 서버액션의 revalidatePath 후 새로 전달되는 initial을 로컬 상태에 반영한다.
  // (create/delete/toggle 결과가 화면에 나타나도록 — 드래그는 낙관적 갱신)
  // React 권장 "prop 변경 시 상태 조정" 패턴: 렌더 중 이전 prop과 비교해 갱신하여
  // useEffect+setState의 cascading 렌더/경고를 피한다.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSlides(initial);
  }

  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const next = arrayMove(slides, oldIndex, newIndex);
    setSlides(next); // 낙관적 갱신
    startTransition(async () => {
      try {
        await reorderSlides(next.map((s) => s.id));
        // 홈엔 맨 위 배너 하나만 나오므로 순서가 곧 "무엇이 보이나"다
        toast.success('순서를 바꿨어요. 홈엔 맨 위 배너가 나와요');
      } catch (e) {
        setSlides(slides); // 낙관적 갱신 되돌리기
        toast.error(
          e instanceof Error ? e.message : '순서를 저장하지 못했어요'
        );
      }
    });
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <button
          type='button'
          onClick={() =>
            startTransition(async () => {
              try {
                await createSlide();
                toast.success('새 배너를 만들었어요. 맨 아래에서 고쳐 주세요');
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : '배너를 만들지 못했어요'
                );
              }
            })
          }
          disabled={isPending}
          className='rounded border border-line px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50'
        >
          새 슬라이드 추가
        </button>
      </div>

      {slides.length === 0 ? (
        <p className='text-sm text-text-subtle'>
          슬라이드가 없습니다. 없으면 랜딩은 코드 기본 배너로 표시됩니다.
        </p>
      ) : (
        <DndContext
          // 고정 id: 없으면 dnd-kit이 aria-describedby를 내부 카운터로 만들어
          // 서버/클라이언트 값이 어긋나 hydration mismatch가 난다. id를 주면 결정적으로 생성됨.
          id='banner-sortable'
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={slides.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className='flex flex-col gap-3'>
              {slides.map((s) => (
                <SlideCard key={s.id} slide={s} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

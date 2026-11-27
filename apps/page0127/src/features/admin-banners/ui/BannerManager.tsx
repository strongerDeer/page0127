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
import {
  homeSlides,
  slideStatus,
  slideTitle,
} from '@/features/admin-banners/lib/slideStatus';
import { SlideRow } from '@/features/admin-banners/ui/SlideRow';

import type { HeroSlideRow } from '@/entities/banner/types';

/**
 * 메인 배너 관리 — 목록 + 편집 분리(2026-11-27 HJ "히스토리나 리스트 없이 관리되는 거 맞아?")
 *
 * 예전엔 배너마다 큰 편집 카드가 줄줄이 쌓여, 홈에 실제로 무엇이 나오는지(맨 앞 하나만 나온다)
 * 알 수 없었다. 이제
 * 1) 맨 위 "지금 홈" 요약 — 비회원·회원 홈 띠지에 나오는 배너
 * 2) 게시 중·예약 목록 — 끌어서 순서(= 홈 우선순위)를 바꾼다
 * 3) 지난·꺼진 배너 — 접어 둔 히스토리. 복제해서 다시 쓸 수 있다
 * 줄을 누르면 그 아래에 편집 칸(SlideCard)이 열린다. 한 번에 하나만.
 */
export const BannerManager = ({ initial }: { initial: HeroSlideRow[] }) => {
  const [slides, setSlides] = useState(initial);

  // 서버액션의 revalidatePath 후 새로 전달되는 initial을 로컬 상태에 반영한다.
  // React 권장 "prop 변경 시 상태 조정" 패턴: 렌더 중 이전 prop과 비교해 갱신하여
  // useEffect+setState의 cascading 렌더/경고를 피한다.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSlides(initial);
  }

  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    // 줄을 누르면 편집이 열리므로, 조금 끌어야 드래그로 본다
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // 렌더 시점 시각 — 상태 묶음은 새로고침·저장 때 다시 계산되면 충분하다
  const [now] = useState(() => new Date());
  const home = homeSlides(slides, now);
  const current = slides.filter((s) => {
    const status = slideStatus(s, now);
    return status === 'live' || status === 'scheduled';
  });
  const past = slides.filter((s) => !current.includes(s));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = current.findIndex((s) => s.id === active.id);
    const newIndex = current.findIndex((s) => s.id === over.id);
    // 지난 배너는 순서와 상관없으니 뒤에 그대로 붙인다
    const next = [...arrayMove(current, oldIndex, newIndex), ...past];
    const before = slides;
    setSlides(next); // 낙관적 갱신
    startTransition(async () => {
      try {
        await reorderSlides(next.map((s) => s.id));
        // 홈엔 맨 위 배너 하나만 나오므로 순서가 곧 "무엇이 보이나"다
        toast.success('순서를 바꿨어요. 홈엔 맨 위 배너가 나와요');
      } catch (err) {
        setSlides(before); // 낙관적 갱신 되돌리기
        toast.error(
          err instanceof Error ? err.message : '순서를 저장하지 못했어요'
        );
      }
    });
  };

  const onCreate = () =>
    startTransition(async () => {
      try {
        await createSlide();
        toast.success(
          '새 배너를 만들었어요. 아래 "지난·꺼진 배너"에서 고쳐 주세요'
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '배너를 만들지 못했어요'
        );
      }
    });

  const rowProps = (s: HeroSlideRow) => ({
    slide: s,
    status: slideStatus(s, now),
    onHome: {
      guest: home.guest?.id === s.id,
      member: home.member?.id === s.id,
    },
    open: openId === s.id,
    onToggle: () => setOpenId((id) => (id === s.id ? null : s.id)),
  });

  return (
    <div className='flex flex-col gap-6 text-text-strong'>
      {/* ── 지금 홈 ── */}
      <section className='rounded border border-line bg-white p-4'>
        <h2 className='mb-2 text-sm font-semibold'>지금 홈 띠지</h2>
        <dl className='grid gap-1.5 text-sm sm:grid-cols-[6rem_1fr]'>
          <dt className='text-text-subtle'>비회원 홈</dt>
          <dd>{home.guest ? slideTitle(home.guest) : '기본 띠지 문구'}</dd>
          <dt className='text-text-subtle'>회원 홈</dt>
          <dd>{home.member ? slideTitle(home.member) : '기본 띠지 문구'}</dd>
        </dl>
        <p className='mt-2 text-xs text-text-subtle'>
          홈 띠지엔 게시 중인 배너 중 <b>맨 위 하나</b>만 나와요. 순서는 아래
          목록에서 끌어서 바꿔요.
        </p>
      </section>

      {/* ── 게시 중·예약 ── */}
      <section className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-semibold'>
            게시 중 · 예약{' '}
            <span className='text-text-subtle'>{current.length}</span>
          </h2>
          <button
            type='button'
            onClick={onCreate}
            disabled={isPending}
            className='rounded border border-line bg-white px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50'
          >
            + 새 배너
          </button>
        </div>
        {current.length === 0 ? (
          <p className='rounded border border-dashed border-line px-4 py-6 text-center text-sm text-text-subtle'>
            게시 중인 배너가 없어요. 홈엔 기본 띠지 문구가 나와요.
          </p>
        ) : (
          <DndContext
            // 고정 id: 없으면 dnd-kit이 aria-describedby를 내부 카운터로 만들어
            // 서버/클라이언트 값이 어긋나 hydration mismatch가 난다.
            id='banner-sortable'
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={current.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className='flex flex-col gap-2'>
                {current.map((s) => (
                  <SlideRow key={s.id} sortable {...rowProps(s)} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* ── 지난·꺼진 배너 = 히스토리 ── */}
      <details className='group flex flex-col gap-2' open={past.length <= 3}>
        <summary className='cursor-pointer text-sm font-semibold'>
          지난 · 꺼진 배너{' '}
          <span className='text-text-subtle'>{past.length}</span>
          <span className='ml-2 text-xs font-normal text-text-subtle'>
            복제하면 날짜만 바꿔 다시 쓸 수 있어요
          </span>
        </summary>
        {past.length === 0 ? (
          <p className='mt-2 text-sm text-text-subtle'>아직 없어요.</p>
        ) : (
          <ol className='mt-2 flex flex-col gap-2'>
            {past.map((s) => (
              <SlideRow key={s.id} {...rowProps(s)} />
            ))}
          </ol>
        )}
      </details>
    </div>
  );
};

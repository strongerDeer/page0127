'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical } from 'lucide-react';

import { isoToKstInput } from '@/features/admin-banners/lib/kstTime';
import {
  type SlideStatus,
  slideTitle,
} from '@/features/admin-banners/lib/slideStatus';
import { SlideCard } from '@/features/admin-banners/ui/SlideCard';

import type { HeroSlideRow } from '@/entities/banner/types';
import type { SlideEvent } from '@/features/admin-banners/lib/slideEvents';

const STATUS_LABEL: Record<SlideStatus, string> = {
  live: '게시 중',
  scheduled: '예약',
  ended: '지남',
  off: '꺼짐',
};

const STATUS_CLASS: Record<SlideStatus, string> = {
  live: 'bg-text-strong text-white',
  scheduled: 'border border-text-strong text-text-strong',
  ended: 'bg-line text-text-subtle',
  off: 'bg-line text-text-subtle',
};

const AUDIENCE_LABEL: Record<HeroSlideRow['audience'], string> = {
  all: '모두',
  guest: '비회원',
  member: '회원',
};

/** "2026-11-27T09:00" → "26.11.27 09:00" (한국 시간). 지난 배너는 해가 달라 연도도 쓴다 */
const shortKst = (iso: string | null) => {
  const v = isoToKstInput(iso);
  if (!v) return null;
  const [date, time] = v.split('T');
  const [y, m, d] = date.split('-');
  return `${y.slice(2)}.${Number(m)}.${Number(d)} ${time}`;
};

const periodText = (s: HeroSlideRow) => {
  const start = shortKst(s.starts_at);
  const end = shortKst(s.ends_at);
  if (!start && !end) return '기간 제한 없음';
  return `${start ?? ''} ~ ${end ?? '계속'}`.trim();
};

type SlideRowProps = {
  slide: HeroSlideRow;
  status: SlideStatus;
  /** 지금 홈 띠지에 실제로 나오는가(비회원·회원) */
  onHome: { guest: boolean; member: boolean };
  open: boolean;
  onToggle: () => void;
  /** 이 배너의 수정 기록(최신순) */
  events: SlideEvent[];
  /** 게시 중·예약 목록만 끌어서 순서를 바꾼다 */
  sortable?: boolean;
};

/**
 * 배너 목록 한 줄 — 띠지 색 견본·제목·대상·기간·클릭 수·상태.
 * 누르면 바로 아래에 편집 칸(SlideCard)이 열린다.
 */
export const SlideRow = ({
  slide,
  status,
  onHome,
  open,
  onToggle,
  events,
  sortable = false,
}: SlideRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: slide.id, disabled: !sortable });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const homeLabel =
    onHome.guest && onHome.member
      ? '지금 홈에 나옴'
      : onHome.guest
        ? '지금 비회원 홈에 나옴'
        : onHome.member
          ? '지금 회원 홈에 나옴'
          : null;

  return (
    <li ref={setNodeRef} style={style} className='list-none'>
      <div
        className={`flex items-center gap-3 border border-line bg-white px-3 py-2.5 ${open ? 'rounded-t' : 'rounded'} ${homeLabel ? 'border-l-4 border-l-text-strong' : ''}`}
      >
        {sortable ? (
          <button
            {...attributes}
            {...listeners}
            type='button'
            className='cursor-grab touch-none text-text-subtle'
            aria-label='끌어서 순서 바꾸기'
          >
            <GripVertical className='h-4 w-4' aria-hidden />
          </button>
        ) : (
          <span className='w-4' aria-hidden />
        )}

        <button
          type='button'
          onClick={onToggle}
          aria-expanded={open}
          className='flex min-w-0 flex-1 items-center gap-3 text-left'
        >
          {/* 띠지 견본 — 색과 윗줄 글자 */}
          <span
            aria-hidden
            className='hidden h-9 w-16 shrink-0 items-center justify-center rounded-sm border border-line text-[9px] font-bold sm:flex'
            style={{ background: slide.bg, color: slide.fg }}
          >
            {slide.belt_style === 'custom' ? slide.eyebrow || '띠지' : '기본'}
          </span>

          <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
            <span className='flex flex-wrap items-center gap-1.5'>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_CLASS[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
              {homeLabel && (
                <span className='text-[11px] font-semibold'>
                  🏠 {homeLabel}
                </span>
              )}
            </span>
            <span className='truncate text-sm font-medium'>
              {slideTitle(slide)}
            </span>
            <span className='text-xs text-text-subtle'>
              {AUDIENCE_LABEL[slide.audience]} · {periodText(slide)} · 클릭{' '}
              {slide.click_count.toLocaleString('ko-KR')}
            </span>
          </span>

          <ChevronDown
            aria-hidden
            className={`h-4 w-4 shrink-0 text-text-subtle transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {open && <SlideCard slide={slide} events={events} />}
    </li>
  );
};

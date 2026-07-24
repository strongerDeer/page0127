'use client';

import { useState, useTransition } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import {
  deleteSlide,
  type SlideFields,
  toggleActive,
  updateSlide,
} from '@/features/admin-banners/api/slideActions';

import type { HeroSlideRow } from '@/entities/banner/types';

const FIELD_LABELS: { key: keyof SlideFields; label: string }[] = [
  { key: 'eyebrow', label: '라벨' },
  { key: 'line1', label: '1줄' },
  { key: 'line2', label: '2줄' },
  { key: 'sub', label: '서브' },
  { key: 'cta', label: '버튼' },
  { key: 'href', label: '링크' },
];

export const SlideCard = ({ slide }: { slide: HeroSlideRow }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: slide.id });
  const [fields, setFields] = useState<SlideFields>({
    eyebrow: slide.eyebrow,
    line1: slide.line1,
    line2: slide.line2,
    sub: slide.sub,
    href: slide.href,
    cta: slide.cta,
    bg: slide.bg,
    fg: slide.fg,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (k: keyof SlideFields, v: string) =>
    setFields((f) => ({ ...f, [k]: v }));

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.'
        );
      }
    });
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: fields.bg,
    color: fields.fg,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='rounded border border-line p-4'
    >
      <div className='mb-2 flex items-center justify-between'>
        <button
          {...attributes}
          {...listeners}
          className='cursor-grab'
          aria-label='순서 이동 핸들'
          type='button'
        >
          <GripVertical className='h-4 w-4' aria-hidden />
        </button>
        <label className='flex items-center gap-1 text-xs'>
          <input
            type='checkbox'
            checked={slide.is_active}
            onChange={(e) =>
              run(() => toggleActive(slide.id, e.target.checked))
            }
            disabled={isPending}
          />
          노출
        </label>
      </div>

      <div className='grid gap-2 sm:grid-cols-2'>
        {FIELD_LABELS.map(({ key, label }) => (
          <label key={key} className='text-xs'>
            {label}
            <input
              value={fields[key]}
              onChange={(e) => set(key, e.target.value)}
              disabled={isPending}
              className='mt-0.5 w-full rounded border border-line bg-white px-2 py-1 text-sm text-text-strong disabled:opacity-50'
            />
          </label>
        ))}
        <label className='text-xs'>
          배경색
          <input
            type='color'
            value={fields.bg}
            onChange={(e) => set('bg', e.target.value)}
            disabled={isPending}
            className='mt-0.5 block h-8 w-16 disabled:opacity-50'
          />
        </label>
        <label className='text-xs'>
          글자색
          <input
            type='color'
            value={fields.fg}
            onChange={(e) => set('fg', e.target.value)}
            disabled={isPending}
            className='mt-0.5 block h-8 w-16 disabled:opacity-50'
          />
        </label>
      </div>

      <div className='mt-3 flex gap-2'>
        <button
          type='button'
          onClick={() => run(() => updateSlide(slide.id, fields))}
          disabled={isPending}
          className='rounded border border-line bg-white px-3 py-1.5 text-sm text-text-strong hover:bg-accent disabled:opacity-50'
        >
          저장
        </button>
        <button
          type='button'
          onClick={() => {
            if (confirm('이 슬라이드를 삭제할까요?'))
              run(() => deleteSlide(slide.id));
          }}
          disabled={isPending}
          className='rounded border border-line bg-white px-3 py-1.5 text-sm text-destructive hover:bg-accent disabled:opacity-50'
        >
          삭제
        </button>
      </div>
      {error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
    </div>
  );
};

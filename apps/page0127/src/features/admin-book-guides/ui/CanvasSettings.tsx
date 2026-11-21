'use client';

import { useRef, useTransition } from 'react';

import { Button, cn } from '@repo/ui';
import { toast } from 'sonner';

import { resizeAvatarFile } from '@/shared/lib/resizeAvatar';

import { uploadGuideArt } from '../api/guideActions';
import { updateCanvas } from '../model/editPeopleSection';
import { ColorSwatches, FontPicker } from './StylePickers';

import type { PeopleSection } from '@/entities/book-guide';

/** 880 캔버스의 2배 — 레티나에서도 흐리지 않고, WEBP 로 보통 1MB 버킷 한도 안에 든다 */
const GUIDE_ART_MAX_EDGE = 1760;
const OPACITY_STEPS = [1, 0.6, 0.3, 0.15] as const;

/**
 * 아무 상자도 고르지 않았을 때 옆 칸 — 캔버스 전체 글꼴과 배경(색·그림 한 장).
 * 그림은 브라우저에서 줄여 올리고, 돌아온 주소만 편집 중인 데이터에 담는다(저장은 아래 버튼으로 따로).
 */
export const CanvasSettings = ({
  section,
  onChange,
}: {
  section: PeopleSection;
  onChange: (next: PeopleSection) => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUpload] = useTransition();
  const background = section.canvas?.background;

  const onPick = (file: File | undefined) => {
    if (!file) return;
    startUpload(async () => {
      const resized = await resizeAvatarFile(file, {
        maxEdge: GUIDE_ART_MAX_EDGE,
        name: 'guide-art.webp',
      });
      const body = new FormData();
      body.set('file', resized);
      const result = await uploadGuideArt(body);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onChange(updateCanvas(section, { background: { image: result.url } }));
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <p className='text-sm text-text-subtle'>
        상자를 눌러 고르세요. 끌어서 옮기고, 오른쪽 아래 모서리로 크기를 바꿔요.
        방향키로 1px, Shift+방향키로 한 칸씩 움직여요.
      </p>
      <h3 className='mt-1 text-sm font-bold'>캔버스 전체</h3>
      <FontPicker
        value={section.canvas?.font}
        onChange={(font) => onChange(updateCanvas(section, { font }))}
      />
      <ColorSwatches
        label='배경 색'
        value={background?.color}
        onChange={(color) =>
          onChange(updateCanvas(section, { background: { color } }))
        }
      />

      <div className='flex flex-col gap-1.5'>
        <span className='text-sm font-medium'>배경 그림</span>
        <input
          ref={fileRef}
          type='file'
          accept='image/png,image/webp,image/jpeg'
          className='sr-only'
          aria-label='배경 그림 고르기'
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <div className='flex gap-1.5'>
          <Button
            size='sm'
            variant='outline'
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
          >
            {isUploading
              ? '올리는 중…'
              : background?.image
                ? '그림 바꾸기'
                : '그림 올리기'}
          </Button>
          {background?.image && (
            <Button
              size='sm'
              variant='ghost'
              onClick={() =>
                onChange(
                  updateCanvas(section, {
                    background: {
                      image: undefined,
                      fit: undefined,
                      opacity: undefined,
                    },
                  })
                )
              }
            >
              지우기
            </Button>
          )}
        </div>
        <p className='text-xs text-text-subtle'>
          그림을 깔면 다크 모드에서도 이 관계도만 밝은 색으로 보여요.
        </p>
      </div>

      {background?.image && (
        <>
          <div role='group' aria-label='그림 맞추기' className='flex gap-1.5'>
            {(
              [
                ['cover', '꽉 채우기'],
                ['contain', '전체 보이기'],
              ] as const
            ).map(([fit, label]) => {
              const active = (background.fit ?? 'cover') === fit;
              return (
                <button
                  key={fit}
                  type='button'
                  aria-pressed={active}
                  onClick={() =>
                    onChange(
                      updateCanvas(section, {
                        background: {
                          fit: fit === 'cover' ? undefined : fit,
                        },
                      })
                    )
                  }
                  className={cn(
                    'rounded-md border border-line px-2 py-1 text-sm',
                    active && 'border-primary bg-accent text-accent-foreground'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div
            role='group'
            aria-label='그림 진하기'
            className='flex flex-col gap-1.5'
          >
            <span className='text-sm font-medium'>그림 진하기</span>
            <div className='flex gap-1.5'>
              {OPACITY_STEPS.map((opacity) => {
                const active = (background.opacity ?? 1) === opacity;
                return (
                  <button
                    key={opacity}
                    type='button'
                    aria-pressed={active}
                    onClick={() =>
                      onChange(
                        updateCanvas(section, {
                          background: {
                            opacity: opacity === 1 ? undefined : opacity,
                          },
                        })
                      )
                    }
                    className={cn(
                      'rounded-md border border-line px-2 py-1 text-sm',
                      active &&
                        'border-primary bg-accent text-accent-foreground'
                    )}
                  >
                    {Math.round(opacity * 100)}%
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

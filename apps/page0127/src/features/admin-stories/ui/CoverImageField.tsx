'use client';

import { ImagePlus } from 'lucide-react';

import { coverCropFrames, parseCoverPosition } from '../model/coverCrop';

import type { StoryImage } from '@/entities/story';

const INPUT =
  'w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm';
const HINT = 'text-xs text-text-subtle';

/** 자주 쓰는 위치 — 그림을 누르기 어려울 때(키보드)도 고를 수 있게 */
const PRESETS = [
  ['0% 0%', '왼쪽 위'],
  ['50% 0%', '위'],
  ['100% 0%', '오른쪽 위'],
  ['0% 50%', '왼쪽'],
  ['50% 50%', '가운데'],
  ['100% 50%', '오른쪽'],
  ['0% 100%', '왼쪽 아래'],
  ['50% 100%', '아래'],
  ['100% 100%', '오른쪽 아래'],
] as const;

const pct = (value: number) => `${value * 100}%`;

type Props = {
  image: StoryImage | null;
  /** 공유 미리보기 전용 가로 그림 — 있으면 공유 카드는 이 그림을 쓴다 */
  shareImage: StoryImage | null;
  onShareUpload: (files: FileList | null) => void;
  onShareRemove: () => void;
  /** "가로% 세로%" */
  position: string;
  busy: boolean;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
  onRemove: () => void;
  onAltChange: (alt: string) => void;
  onPositionChange: (position: string) => void;
};

/**
 * 대표 이미지 칸 (HJ 2026-11-27) — 목록 썸네일과 공유 미리보기에 쓰는 그림 한 장.
 *
 * 원본 위에 두 테두리를 겹쳐 "어디가 잘려 보이는지"를 보여 준다:
 *   - 실선: 목록 정사각형 썸네일 — 그림을 누르거나 아래 버튼으로 위치를 옮긴다
 *   - 점선: 공유 미리보기(1200×630) — 늘 가운데 기준. 공유용 그림을 따로 올리면 점선은 사라진다
 *
 * 공유용 그림(HJ 2026-11-27 B안): 목록은 정사각형, 카톡은 가로라 한 장으로 둘 다 맞추기 어렵다.
 * 정사각형 대표 이미지 + 1200×630 공유용 그림을 따로 올릴 수 있게 한다.
 * 옆에는 실제 목록 크기의 썸네일을 같은 object-position 으로 그린다.
 */
export const CoverImageField = ({
  image,
  shareImage,
  onShareUpload,
  onShareRemove,
  position,
  busy,
  uploading,
  onUpload,
  onRemove,
  onAltChange,
  onPositionChange,
}: Props) => {
  const frames = image ? coverCropFrames(image, position) : null;
  const { x, y } = parseCoverPosition(position);

  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-sm font-medium'>대표 이미지(선택)</h2>
      <p className={HINT}>
        목록 썸네일과 카톡·SNS 공유 미리보기에 쓰여요. 본문에는 나오지 않아요.
        없으면 지금처럼 관계도 윗부분·첫 차트 숫자·자동 공유 그림을 써요. 공유
        미리보기에 딱 맞추려면 1200×630 으로 올려 주세요.
      </p>

      {image && frames && (
        <div className='flex flex-wrap items-start gap-4'>
          <div className='flex flex-col gap-1'>
            {/* 원본 + 잘림 테두리. 누른 곳이 정사각형 썸네일의 기준점이 된다 */}
            <button
              type='button'
              aria-label='누른 곳을 목록 썸네일 기준점으로'
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const toPct = (value: number) =>
                  Math.round(Math.max(0, Math.min(1, value)) * 100);
                onPositionChange(
                  `${toPct((event.clientX - rect.left) / rect.width)}% ${toPct((event.clientY - rect.top) / rect.height)}%`
                );
              }}
              className='relative w-72 cursor-crosshair overflow-hidden rounded-md border border-line'
            >
              {/* 어드민 미리보기 — 원본 주소를 그대로 그린다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt='' className='block w-full' />
              {/* 공유 미리보기 영역(가운데 기준) — 공유용 그림이 따로 있으면 그리지 않는다 */}
              {!shareImage && (
                <span
                  aria-hidden
                  className='pointer-events-none absolute border-2 border-dashed border-white/90 mix-blend-difference'
                  style={{
                    left: pct(frames.og.left),
                    top: pct(frames.og.top),
                    width: pct(frames.og.width),
                    height: pct(frames.og.height),
                  }}
                />
              )}
              {/* 목록 썸네일 영역 — 바깥은 어둡게 */}
              <span
                aria-hidden
                className='pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]'
                style={{
                  left: pct(frames.square.left),
                  top: pct(frames.square.top),
                  width: pct(frames.square.width),
                  height: pct(frames.square.height),
                }}
              />
              {/* 기준점 */}
              <span
                aria-hidden
                className='pointer-events-none absolute size-3 -translate-1/2 rounded-full border-2 border-white bg-primary'
                style={{ left: `${x}%`, top: `${y}%` }}
              />
            </button>
            <span className={HINT}>
              {shareImage
                ? '실선 = 목록 썸네일 · 그림을 눌러 위치 고르기'
                : '실선 = 목록 썸네일, 점선 = 공유 미리보기 · 그림을 눌러 위치 고르기'}
            </span>
          </div>

          <div className='flex min-w-60 flex-1 flex-col gap-3'>
            <div className='flex items-end gap-3'>
              <div className='flex flex-col gap-1'>
                <span className={HINT}>목록에서</span>
                {/* 목록(StoryListItem)과 같은 크기·같은 자르기 */}
                <div className='size-28 overflow-hidden rounded-xl border border-line-soft'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt=''
                    className='size-full object-cover'
                    style={{ objectPosition: position }}
                  />
                </div>
              </div>
              <div
                role='group'
                aria-label='목록 썸네일 위치'
                className='grid grid-cols-3 gap-1'
              >
                {PRESETS.map(([value, label]) => (
                  <button
                    key={value}
                    type='button'
                    aria-label={label}
                    aria-pressed={position === value}
                    title={label}
                    onClick={() => onPositionChange(value)}
                    className={`size-7 rounded border text-[10px] ${position === value ? 'border-primary bg-primary text-primary-foreground' : 'border-line hover:bg-accent'}`}
                  >
                    ●
                  </button>
                ))}
              </div>
              <span className='text-xs text-text-subtle tabular-nums'>
                {position}
              </span>
            </div>

            {/* 공유용 그림 */}
            <div className='flex flex-col gap-2 rounded-md border border-dashed border-line p-3'>
              <span className='text-sm'>공유용 그림(선택)</span>
              <span className={HINT}>
                카톡·SNS 미리보기에만 쓰여요. 1200×630 가로 그림이면 딱 맞아요.
                없으면 위 대표 이미지를 가운데 기준으로 잘라 써요.
              </span>
              {shareImage && (
                // 공유 카드와 같은 비율·같은 자르기(가운데)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shareImage.src}
                  alt=''
                  className='aspect-[1200/630] w-72 rounded-md border border-line object-cover'
                />
              )}
              <div className='flex flex-wrap gap-2'>
                <label className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs hover:bg-accent'>
                  <ImagePlus className='size-3.5' aria-hidden />
                  {shareImage ? '공유용 그림 바꾸기' : '공유용 그림 올리기'}
                  <input
                    type='file'
                    accept='image/png,image/webp,image/jpeg'
                    className='sr-only'
                    disabled={busy}
                    onChange={(e) => {
                      onShareUpload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                {shareImage && (
                  <button
                    type='button'
                    onClick={onShareRemove}
                    className='rounded-md border border-line px-3 py-1.5 text-xs text-destructive hover:bg-accent'
                  >
                    빼기
                  </button>
                )}
              </div>
            </div>

            <label className='flex flex-col gap-1 text-sm'>
              그림 설명(alt)
              <input
                value={image.alt}
                onChange={(e) => onAltChange(e.target.value)}
                className={INPUT}
              />
            </label>
          </div>
        </div>
      )}

      <div className='flex flex-wrap items-center gap-2'>
        <label className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:bg-accent'>
          <ImagePlus className='size-4' aria-hidden />
          {image ? '대표 이미지 바꾸기' : '대표 이미지 올리기'}
          <input
            type='file'
            accept='image/png,image/webp,image/jpeg'
            className='sr-only'
            disabled={busy}
            onChange={(e) => {
              onUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {image && (
          <button
            type='button'
            onClick={onRemove}
            className='rounded-md border border-line px-3 py-2 text-sm text-destructive hover:bg-accent'
          >
            그림 빼기
          </button>
        )}
        {uploading && <span className={HINT}>올리는 중…</span>}
      </div>
    </section>
  );
};

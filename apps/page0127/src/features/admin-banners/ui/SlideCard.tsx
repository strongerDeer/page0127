'use client';

import { useRef, useState, useTransition } from 'react';

import { toast } from 'sonner';

import { resizeAvatarFile } from '@/shared/lib/resizeAvatar';

import {
  deleteSlide,
  duplicateSlide,
  type SlideFields,
  toggleActive,
  updateSlide,
  uploadBannerArt,
} from '@/features/admin-banners/api/slideActions';
import { isoToKstInput } from '@/features/admin-banners/lib/kstTime';
import { BeltFields } from '@/features/admin-banners/ui/BeltFields';
import { CoverPreview } from '@/features/admin-banners/ui/CoverPreview';

import type { HeroSlideRow } from '@/entities/banner/types';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: '모두' },
  { value: 'guest', label: '비로그인만' },
  { value: 'member', label: '로그인만' },
] as const;

const INPUT_CLASS =
  'mt-0.5 w-full rounded border border-line bg-white px-2 py-1 text-sm text-text-strong disabled:opacity-50';

/** 홈 표지에 올릴 그림의 최대 변. 표지 너비의 60% 를 레티나 2배로 보여도 충분하다 */
const ART_MAX_EDGE = 600;

/** 두 갈래 선택(기본/직접) — 라디오를 버튼처럼 */
const Segmented = <T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) => (
  <div className='inline-flex overflow-hidden rounded border border-line text-xs'>
    {options.map((o) => (
      <label
        key={o.value}
        className={`cursor-pointer px-3 py-1.5 ${value === o.value ? 'bg-text-strong text-white' : 'bg-white text-text-strong'}`}
      >
        <input
          type='radio'
          name={name}
          value={o.value}
          checked={value === o.value}
          onChange={() => onChange(o.value)}
          disabled={disabled}
          className='sr-only'
        />
        {o.label}
      </label>
    ))}
  </div>
);

export const SlideCard = ({ slide }: { slide: HeroSlideRow }) => {
  const [fields, setFields] = useState<SlideFields>({
    eyebrow: slide.eyebrow,
    line1: slide.line1,
    line2: slide.line2,
    sub: slide.sub,
    href: slide.href,
    cta: slide.cta,
    bg: slide.bg,
    fg: slide.fg,
    audience: slide.audience,
    // 예약 시각은 어느 나라에서 열어도 한국 시간으로 보인다
    starts_at: isoToKstInput(slide.starts_at),
    ends_at: isoToKstInput(slide.ends_at),
    belt_style: slide.belt_style,
    cover_style: slide.cover_style,
    cover_bg: slide.cover_bg ?? '#0969e0',
    cover_fg: slide.cover_fg ?? '#fbf1e6',
    cover_title: slide.cover_title ?? '',
    show_number: slide.show_number,
    art_url: slide.art_url ?? '',
    art_x: slide.art_x,
    art_y: slide.art_y,
    art_w: slide.art_w,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof SlideFields>(k: K, v: SlideFields[K]) =>
    setFields((f) => ({ ...f, [k]: v }));

  /**
   * 서버 액션을 실행하고 결과를 토스트로 알린다(2026-11-27 HJ "저장 피드백 필요").
   * success 를 비우면 성공 토스트는 띄우지 않는다(그림 올리기처럼 저장 전 중간 단계).
   * 실패는 카드 아래 문구와 토스트 둘 다 — 토스트는 사라지므로 이유를 카드에 남긴다.
   */
  const run = (fn: () => Promise<void>, success?: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        if (success) toast.success(success);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.';
        setError(message);
        toast.error(message);
      }
    });
  };

  // 그림은 브라우저에서 600px WEBP 로 줄여 보낸 뒤, 돌아온 주소만 폼에 담는다(저장은 따로)
  const onPickArt = (file: File | undefined) => {
    if (!file) return;
    run(async () => {
      const resized = await resizeAvatarFile(file, {
        maxEdge: ART_MAX_EDGE,
        name: 'art.webp',
      });
      const body = new FormData();
      body.set('file', resized);
      const url = await uploadBannerArt(body);
      set('art_url', url);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    // 목록 줄(SlideRow)을 누르면 그 아래에 열리는 편집 칸 — 순서 끌기는 목록 줄이 맡는다
    <div className='rounded-b border border-t-0 border-line bg-white p-4 text-text-strong'>
      <div className='mb-2 flex items-center justify-end'>
        <div className='flex items-center gap-3'>
          {/* 클릭 수 — 무엇이 먹히는지 여기서 바로 비교한다.
              0 도 정보다("아무도 안 누른다")이므로 감추지 않는다 */}
          <span className='text-xs tabular-nums opacity-70'>
            클릭 {slide.click_count.toLocaleString('ko-KR')}
          </span>
          <label className='flex items-center gap-1 text-xs'>
            <input
              type='checkbox'
              checked={slide.is_active}
              onChange={(e) =>
                run(
                  () => toggleActive(slide.id, e.target.checked),
                  e.target.checked
                    ? '노출을 켰어요. 홈에 바로 반영돼요'
                    : '노출을 껐어요'
                )
              }
              disabled={isPending}
            />
            노출
          </label>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-[1fr_auto]'>
        <div className='flex flex-col gap-5'>
          {/* ── 게시 조건 ── */}
          <fieldset className='grid gap-2 sm:grid-cols-3'>
            <legend className='mb-1 text-sm font-semibold'>게시</legend>
            <label className='text-xs'>
              노출 대상
              <select
                value={fields.audience}
                onChange={(e) =>
                  set('audience', e.target.value as SlideFields['audience'])
                }
                disabled={isPending}
                className={INPUT_CLASS}
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {/* 비워 두면 "제한 없음". 저장 시 NULL 로 돌아간다 */}
            <label className='text-xs'>
              시작 · 한국 시간 (비우면 제한 없음)
              <input
                type='datetime-local'
                value={fields.starts_at}
                onChange={(e) => set('starts_at', e.target.value)}
                disabled={isPending}
                className={INPUT_CLASS}
              />
            </label>
            <label className='text-xs'>
              종료 · 한국 시간 (비우면 제한 없음)
              <input
                type='datetime-local'
                value={fields.ends_at}
                onChange={(e) => set('ends_at', e.target.value)}
                disabled={isPending}
                className={INPUT_CLASS}
              />
            </label>
          </fieldset>

          {/* ── 띠지 ── */}
          <fieldset className='flex flex-col gap-2'>
            <legend className='mb-1 text-sm font-semibold'>띠지</legend>
            <Segmented
              name={`belt-${slide.id}`}
              value={fields.belt_style}
              options={[
                { value: 'default', label: '기본 띠지' },
                { value: 'custom', label: '직접 쓰기' },
              ]}
              onChange={(v) => set('belt_style', v)}
              disabled={isPending}
            />
            {fields.belt_style === 'custom' ? (
              <BeltFields fields={fields} set={set} disabled={isPending} />
            ) : (
              <p className='text-xs text-text-subtle'>
                홈 기본 띠지 문구를 그대로 보여 줘요. 띠지 글자를 바꾸려면 “직접
                쓰기”를 고르세요.
              </p>
            )}
          </fieldset>

          {/* ── 표지 ── */}
          <fieldset className='flex flex-col gap-2'>
            <legend className='mb-1 text-sm font-semibold'>표지</legend>
            <Segmented
              name={`cover-${slide.id}`}
              value={fields.cover_style}
              options={[
                { value: 'default', label: '기본 표지' },
                { value: 'custom', label: '갈아입히기' },
              ]}
              onChange={(v) => set('cover_style', v)}
              disabled={isPending}
            />
            {fields.cover_style === 'custom' && (
              <div className='grid gap-2 sm:grid-cols-2'>
                <label className='text-xs'>
                  표지 색
                  <input
                    type='color'
                    value={fields.cover_bg}
                    onChange={(e) => set('cover_bg', e.target.value)}
                    disabled={isPending}
                    className='mt-0.5 block h-8 w-16 disabled:opacity-50'
                  />
                </label>
                <label className='text-xs'>
                  표지 글자색
                  <input
                    type='color'
                    value={fields.cover_fg}
                    onChange={(e) => set('cover_fg', e.target.value)}
                    disabled={isPending}
                    className='mt-0.5 block h-8 w-16 disabled:opacity-50'
                  />
                </label>
                <label className='text-xs sm:col-span-2'>
                  표지 제목 (비우면 기본 제목, 줄바꿈 그대로)
                  <textarea
                    rows={2}
                    value={fields.cover_title}
                    onChange={(e) => set('cover_title', e.target.value)}
                    disabled={isPending}
                    className={INPUT_CLASS}
                  />
                </label>
                <label className='flex items-center gap-1.5 text-xs sm:col-span-2'>
                  <input
                    type='checkbox'
                    checked={fields.show_number}
                    onChange={(e) => set('show_number', e.target.checked)}
                    disabled={isPending}
                  />
                  큰 숫자 “0127.” 보이기
                </label>

                <div className='flex flex-wrap items-center gap-2 text-xs sm:col-span-2'>
                  <input
                    ref={fileRef}
                    type='file'
                    accept='image/png,image/webp,image/jpeg'
                    onChange={(e) => onPickArt(e.target.files?.[0])}
                    disabled={isPending}
                    className='sr-only'
                    id={`art-${slide.id}`}
                  />
                  <label
                    htmlFor={`art-${slide.id}`}
                    className='cursor-pointer rounded border border-line px-3 py-1.5 hover:bg-accent'
                  >
                    {fields.art_url ? '그림 바꾸기' : '그림 올리기'}
                  </label>
                  {fields.art_url && (
                    <button
                      type='button'
                      onClick={() => set('art_url', '')}
                      disabled={isPending}
                      className='rounded border border-line px-3 py-1.5 text-destructive hover:bg-accent disabled:opacity-50'
                    >
                      그림 빼기
                    </button>
                  )}
                  <span className='text-text-subtle'>
                    PNG(투명 배경 추천)·WEBP·JPG. 올리면 600px 로 줄어요.
                  </span>
                </div>

                {fields.art_url && (
                  <>
                    <label className='text-xs'>
                      가로 위치 {fields.art_x}%
                      <input
                        type='range'
                        min={0}
                        max={100}
                        step={0.5}
                        value={fields.art_x}
                        onChange={(e) => set('art_x', Number(e.target.value))}
                        disabled={isPending}
                        className='block w-full'
                      />
                    </label>
                    <label className='text-xs'>
                      세로 위치 {fields.art_y}%
                      <input
                        type='range'
                        min={0}
                        max={100}
                        step={0.5}
                        value={fields.art_y}
                        onChange={(e) => set('art_y', Number(e.target.value))}
                        disabled={isPending}
                        className='block w-full'
                      />
                    </label>
                    <label className='text-xs sm:col-span-2'>
                      크기 (표지 너비의 {fields.art_w}%, 최대 60%)
                      <input
                        type='range'
                        min={10}
                        max={60}
                        step={1}
                        value={fields.art_w}
                        onChange={(e) => set('art_w', Number(e.target.value))}
                        disabled={isPending}
                        className='block w-full'
                      />
                    </label>
                  </>
                )}
              </div>
            )}
          </fieldset>
        </div>

        {/* ── 미리보기 — 그림은 끌어서 옮긴다 ── */}
        <div className='flex flex-col items-center gap-1.5'>
          <span className='text-xs text-text-subtle'>홈 표지 미리보기</span>
          <CoverPreview
            fields={fields}
            disabled={isPending}
            onMoveArt={(x, y) =>
              setFields((f) => ({ ...f, art_x: x, art_y: y }))
            }
          />
          {fields.cover_style === 'custom' && fields.art_url && (
            <span className='text-[11px] text-text-subtle'>
              그림을 끌어서 옮길 수 있어요
            </span>
          )}
        </div>
      </div>

      <div className='mt-4 flex gap-2'>
        <button
          type='button'
          onClick={() =>
            run(
              () => updateSlide(slide.id, fields),
              slide.is_active
                ? '저장했어요. 홈에 바로 반영돼요'
                : '저장했어요. 노출을 켜면 홈에 나와요'
            )
          }
          disabled={isPending}
          className='rounded border border-line bg-white px-3 py-1.5 text-sm text-text-strong hover:bg-accent disabled:opacity-50'
        >
          저장
        </button>
        {/* 복제본은 꺼진 채 맨 끝에 생긴다 — 날짜만 바꿔 내년에 다시 쓰기 */}
        <button
          type='button'
          onClick={() =>
            run(
              () => duplicateSlide(slide.id),
              '복제했어요. 맨 아래에 꺼진 채로 생겼어요'
            )
          }
          disabled={isPending}
          className='rounded border border-line bg-white px-3 py-1.5 text-sm text-text-strong hover:bg-accent disabled:opacity-50'
        >
          복제
        </button>
        <button
          type='button'
          onClick={() => {
            if (confirm('이 슬라이드를 삭제할까요?'))
              run(() => deleteSlide(slide.id), '삭제했어요');
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

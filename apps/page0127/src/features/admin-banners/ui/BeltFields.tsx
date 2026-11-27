'use client';

import { useState } from 'react';

import type { SlideFields } from '@/features/admin-banners/api/slideActions';

/** 띠지 기본색(크림 종이·남색 글자) — AboutHero.module.css 의 --belt·--belt-ink 와 같다 */
const DEFAULT_BELT_COLORS = { bg: '#f6efe2', fg: '#14294e' };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const INPUT_CLASS =
  'w-full rounded border border-line bg-white px-2 py-1 text-sm text-text-strong placeholder:text-text-subtle/60 disabled:opacity-50';

type BeltTextKey = 'eyebrow' | 'line1' | 'line2' | 'sub';

/**
 * 띠지에 보이는 네 줄 — 위에서 아래 순서 그대로.
 * 번호(①~④)는 위의 띠지 지도와 아래 입력 칸을 잇는 표시라 둘이 같은 배열을 쓴다.
 */
const BELT_LINES: {
  key: BeltTextKey;
  mark: string;
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  {
    key: 'eyebrow',
    mark: '①',
    label: '윗줄 작은 글씨',
    placeholder: '온라인 필사',
  },
  {
    key: 'line1',
    mark: '②',
    label: '큰 문장 첫 줄',
    placeholder: '『어린 왕자』를',
  },
  {
    key: 'line2',
    mark: '③',
    label: '큰 문장 둘째 줄',
    placeholder: '한 글자씩 따라 써 봐요',
  },
  {
    key: 'sub',
    mark: '④',
    label: '아랫줄',
    placeholder: '명문장 한 줄부터 전문 27장까지',
    hint: '끝에 → 는 자동으로 붙어요',
  },
];

type BeltFieldsProps = {
  fields: SlideFields;
  set: <K extends keyof SlideFields>(k: K, v: SlideFields[K]) => void;
  disabled?: boolean;
};

/**
 * 어드민 "띠지 직접 쓰기" 입력 묶음 (2026-11-27 HJ "입력이 헷갈려" → 시각적으로 정리)
 *
 * 예전엔 칸 이름이 롤링 배너 시절 그대로(라벨·1줄·2줄·서브·버튼)라 띠지 어디에
 * 나오는지 알 수 없었고, '버튼'은 화면에 아예 안 보이는 값이었다. 그래서
 * 1) 띠지 지도에 ①~④ 번호를 달고, 2) 입력 칸을 같은 번호·같은 순서로 세우고,
 * 3) 화면에 안 보이는 값(통계 이름)은 맨 아래 따로 떼어 둔다.
 */
export const BeltFields = ({ fields, set, disabled }: BeltFieldsProps) => (
  <div className='flex flex-col gap-4'>
    <BeltMap fields={fields} />

    {/* ── 띠지에 보이는 글자: 지도와 같은 번호·순서 ── */}
    <div className='flex flex-col gap-2'>
      {BELT_LINES.map(({ key, mark, label, placeholder, hint }) => (
        <label
          key={key}
          className='grid grid-cols-[1.5rem_1fr] sm:grid-cols-[1.5rem_7.5rem_1fr] items-center gap-2 text-xs'
        >
          <span aria-hidden='true' className='text-base text-text-subtle'>
            {mark}
          </span>
          <span className='font-medium'>{label}</span>
          <span className='col-span-2 flex flex-col gap-0.5 sm:col-span-1'>
            <input
              value={fields[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={`예: ${placeholder}`}
              disabled={disabled}
              className={INPUT_CLASS}
            />
            {hint && <span className='text-text-subtle'>{hint}</span>}
          </span>
        </label>
      ))}
    </div>

    {/* ── 누르면 가는 곳 ── */}
    <label className='grid grid-cols-[1.5rem_1fr] sm:grid-cols-[1.5rem_7.5rem_1fr] items-center gap-2 text-xs'>
      <span aria-hidden='true' className='text-base text-text-subtle'>
        👆
      </span>
      <span className='font-medium'>누르면 가는 곳</span>
      <span className='col-span-2 flex flex-col gap-0.5 sm:col-span-1'>
        <input
          value={fields.href}
          onChange={(e) => set('href', e.target.value)}
          placeholder='예: /typing/little-prince'
          disabled={disabled}
          className={INPUT_CLASS}
        />
        <span className='text-text-subtle'>
          띠지 전체가 링크예요. 우리 사이트는 /로 시작하는 주소만 써요
        </span>
      </span>
    </label>

    {/* ── 색 ── */}
    <div className='grid grid-cols-[1.5rem_1fr] sm:grid-cols-[1.5rem_7.5rem_1fr] items-center gap-2 text-xs'>
      <span aria-hidden='true' className='text-base text-text-subtle'>
        🎨
      </span>
      <span className='font-medium'>색</span>
      <div className='col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1'>
        <ColorInput
          label='띠지'
          value={fields.bg}
          onChange={(v) => set('bg', v)}
          disabled={disabled}
        />
        <ColorInput
          label='글자'
          value={fields.fg}
          onChange={(v) => set('fg', v)}
          disabled={disabled}
        />
        <button
          type='button'
          onClick={() => {
            set('bg', DEFAULT_BELT_COLORS.bg);
            set('fg', DEFAULT_BELT_COLORS.fg);
          }}
          disabled={disabled}
          className='rounded border border-line px-2 py-1 hover:bg-accent disabled:opacity-50'
        >
          기본 크림색으로
        </button>
      </div>
    </div>

    {/* ── 화면에 안 보이는 값 — 헷갈리지 않게 따로 뗀다 ── */}
    <div className='rounded border border-dashed border-line px-3 py-2'>
      <label className='grid grid-cols-[1.5rem_1fr] sm:grid-cols-[1.5rem_7.5rem_1fr] items-center gap-2 text-xs'>
        <span aria-hidden='true' className='text-base text-text-subtle'>
          📊
        </span>
        <span className='font-medium'>
          통계 이름
          <span className='block font-normal text-text-subtle'>
            화면에 안 보임
          </span>
        </span>
        <span className='col-span-2 flex flex-col gap-0.5 sm:col-span-1'>
          <input
            value={fields.cta}
            onChange={(e) => set('cta', e.target.value)}
            placeholder='예: 온라인 필사'
            disabled={disabled}
            className={INPUT_CLASS}
          />
          <span className='text-text-subtle'>
            GA 와 클릭 수에서 이 배너를 알아보는 이름이에요
          </span>
        </span>
      </label>
    </div>
  </div>
);

/**
 * 띠지 지도 — 실제 띠지 색 위에 지금 입력한 글자를 ①~④ 번호와 함께 보여 준다.
 * 비어 있는 줄은 예시 문구를 흐리게 깔아 "여기에 무엇이 들어가는지"를 알려 준다.
 */
const BeltMap = ({ fields }: { fields: SlideFields }) => (
  <figure className='flex flex-col gap-1'>
    <figcaption className='text-xs text-text-subtle'>
      띠지 지도 — 번호가 아래 칸과 이어져요
    </figcaption>
    <div
      className='flex flex-col gap-1 rounded border border-line px-4 py-3 shadow-sm'
      style={{ background: fields.bg, color: fields.fg }}
    >
      {BELT_LINES.map(({ key, mark, placeholder }) => {
        const value = fields[key].trim();
        const isBig = key === 'line1' || key === 'line2';
        return (
          <div key={key} className='flex items-baseline gap-2'>
            <span
              aria-hidden='true'
              className='w-4 shrink-0 text-xs opacity-60'
            >
              {mark}
            </span>
            <span
              className={
                isBig
                  ? 'text-base font-extrabold leading-tight'
                  : 'text-xs opacity-80'
              }
              style={value ? undefined : { opacity: 0.35 }}
            >
              {value || placeholder}
              {key === 'sub' && ' →'}
            </span>
          </div>
        );
      })}
    </div>
  </figure>
);

/**
 * 색 고르기 + 색 코드 칸.
 * 코드 칸은 #rrggbb 가 완성됐을 때만 폼 값에 넣는다 — 서버는 띠지 색을 검사하지 않아
 * 치다 만 값("#f6e")이 저장되면 띠지 색이 깨지기 때문이다. 칸을 벗어나면 마지막 올바른 값으로 돌아간다.
 */
const ColorInput = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) => {
  // 치는 중인 글자. null 이면 폼 값(value)을 그대로 보여 준다
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <span className='flex items-center gap-1'>
      <span>{label}</span>
      <input
        type='color'
        aria-label={`${label} 색 고르기`}
        value={HEX_COLOR.test(value) ? value : '#000000'}
        onChange={(e) => {
          setDraft(null);
          onChange(e.target.value);
        }}
        disabled={disabled}
        className='h-7 w-9 cursor-pointer disabled:opacity-50'
      />
      <input
        aria-label={`${label} 색 코드`}
        value={draft ?? value}
        onChange={(e) => {
          const next = e.target.value.trim();
          setDraft(next);
          if (HEX_COLOR.test(next)) onChange(next.toLowerCase());
        }}
        onBlur={() => setDraft(null)}
        placeholder='#f6efe2'
        spellCheck={false}
        disabled={disabled}
        className='w-20 rounded border border-line bg-white px-1.5 py-1 font-mono text-xs disabled:opacity-50'
      />
    </span>
  );
};

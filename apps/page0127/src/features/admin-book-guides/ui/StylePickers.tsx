'use client';

import { cn } from '@repo/ui';

import { GUIDE_BORDER_STYLES, GUIDE_COLORS } from '@/entities/book-guide';

import type { GuideBorder, GuideColor, GuideFont } from '@/entities/book-guide';
import type { ReactNode } from 'react';

/**
 * 편집기 옆 칸의 "고르기" 부품들 — 색·테두리·글꼴.
 * 색은 디자인 시스템 토큰 이름만 고른다(HJ 11/21 토큰 팔레트 결정). 견본 칸도 같은 CSS 변수로 칠해서
 * 다크 모드에서 보면 다크 값으로 보인다 — 사이트에 보일 색 그대로.
 */

export const colorLabel: Record<GuideColor, string> = {
  primary: '파랑',
  'guide-green': '초록',
  'text-strong': '남색',
  'text-body': '본문 남색',
  'text-subtle': '회남색',
  'chart-7': '보라',
  'rank-up': '주황',
  line: '회색 선',
  'line-soft': '연한 선',
  card: '흰색',
  sunken: '회색 면',
  accent: '연파랑',
};

const borderStyleLabel: Record<(typeof GUIDE_BORDER_STYLES)[number], string> = {
  solid: '실선',
  dashed: '대시',
  dotted: '점선',
};

const chip = (active: boolean) =>
  cn(
    'rounded-md border border-line px-2 py-1 text-sm',
    active && 'border-primary bg-accent text-accent-foreground'
  );

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div role='group' aria-label={label} className='flex flex-col gap-1.5'>
    <span className='text-sm font-medium'>{label}</span>
    {children}
  </div>
);

/** 토큰 색 견본 — 고르지 않음(none)도 고를 수 있다 */
export const ColorSwatches = ({
  label,
  value,
  onChange,
  noneLabel = '없음',
}: {
  label: string;
  value?: GuideColor;
  onChange: (color: GuideColor | undefined) => void;
  noneLabel?: string;
}) => (
  <Group label={label}>
    <div className='flex flex-wrap gap-1.5'>
      <button
        type='button'
        aria-pressed={!value}
        onClick={() => onChange(undefined)}
        className={chip(!value)}
      >
        {noneLabel}
      </button>
      {GUIDE_COLORS.map((color) => (
        <button
          key={color}
          type='button'
          title={`${colorLabel[color]} (${color})`}
          aria-label={colorLabel[color]}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            'size-7 rounded-md border border-line ring-offset-2 ring-offset-card',
            value === color && 'ring-2 ring-primary'
          )}
          style={{ backgroundColor: `var(--${color})` }}
        />
      ))}
    </div>
  </Group>
);

/** 테두리 — 두께 0 이면 지운다(tone 기본 테두리로 돌아감) */
export const BorderPicker = ({
  value,
  onChange,
}: {
  value?: GuideBorder;
  onChange: (border: GuideBorder | undefined) => void;
}) => {
  const set = (patch: Partial<GuideBorder>) =>
    onChange({ color: 'line', width: 2, ...value, ...patch });
  return (
    <>
      <Group label='테두리 두께'>
        <div className='flex flex-wrap gap-1.5'>
          {[0, 1, 2, 3, 4].map((width) => {
            const active = (value?.width ?? 0) === width;
            return (
              <button
                key={width}
                type='button'
                aria-pressed={active}
                onClick={() =>
                  width === 0 ? onChange(undefined) : set({ width })
                }
                className={cn(chip(active), 'min-w-9')}
              >
                {width === 0 ? '기본' : width}
              </button>
            );
          })}
        </div>
      </Group>
      {value && (
        <>
          <Group label='테두리 모양'>
            <div className='flex gap-1.5'>
              {GUIDE_BORDER_STYLES.map((style) => {
                const active = (value.style ?? 'solid') === style;
                return (
                  <button
                    key={style}
                    type='button'
                    aria-pressed={active}
                    onClick={() =>
                      set({ style: style === 'solid' ? undefined : style })
                    }
                    className={chip(active)}
                  >
                    {borderStyleLabel[style]}
                  </button>
                );
              })}
            </div>
          </Group>
          <ColorSwatches
            label='테두리 색'
            value={value.color}
            noneLabel='회색 선'
            onChange={(color) => set({ color: color ?? 'line' })}
          />
        </>
      )}
    </>
  );
};

/** 글꼴 — inherit=캔버스 글꼴 따라감(상자용). 캔버스용은 inheritLabel 없이 */
export const FontPicker = ({
  value,
  onChange,
  inheritLabel,
}: {
  value?: GuideFont;
  onChange: (font: GuideFont | undefined) => void;
  inheritLabel?: string;
}) => {
  const options: { key: GuideFont | undefined; label: string }[] = [
    ...(inheritLabel ? [{ key: undefined, label: inheritLabel }] : []),
    { key: inheritLabel ? 'sans' : undefined, label: '기본' },
    { key: 'serif', label: '명조' },
  ];
  return (
    <Group label='글꼴'>
      <div className='flex flex-wrap gap-1.5'>
        {options.map((o) => (
          <button
            key={o.label}
            type='button'
            aria-pressed={value === o.key}
            onClick={() => onChange(o.key)}
            className={chip(value === o.key)}
            style={
              o.key === 'serif'
                ? { fontFamily: '"AppleMyungjo", "Noto Serif KR", serif' }
                : undefined
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </Group>
  );
};

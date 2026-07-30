'use client';

import { useState } from 'react';

import { contrastRatio, gradeOf } from './contrast';

import type { Token } from './tokens';

type SwatchProps = {
  token: Token;
  /** 명암비를 잴 배경. 주면 등급 배지가 붙는다 */
  contrastAgainst?: string;
  /** 칩 뒤에 깔 배경 — 흰색 계열 토큰이 흰 바탕에 묻히지 않게 한다 */
  chipBackground?: string;
};

/** 클릭하면 CSS 변수 표기(`var(--navy-600)`)가 복사된다 — 코드에 그대로 붙일 수 있는 형태 */
export const Swatch = ({
  token,
  contrastAgainst,
  chipBackground,
}: SwatchProps) => {
  const [copied, setCopied] = useState(false);

  const copyText = `var(${token.name})`;
  const ratio = contrastAgainst
    ? contrastRatio(token.value, contrastAgainst)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type='button'
      onClick={handleCopy}
      title={token.description ?? copyText}
      className='w-40 shrink-0 rounded-md border border-line-soft bg-card p-2 text-left transition-colors hover:border-line'
    >
      {/* 체커보드를 깔아 흰색·반투명 토큰이 흰 바탕에 묻히지 않게 한다 */}
      <span
        className='block h-14 w-full rounded-sm border border-line-soft'
        style={{
          backgroundColor: token.value,
          backgroundImage:
            chipBackground ??
            'linear-gradient(45deg, #eceff2 25%, transparent 25%, transparent 75%, #eceff2 75%), linear-gradient(45deg, #eceff2 25%, transparent 25%, transparent 75%, #eceff2 75%)',
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0, 6px 6px',
          backgroundBlendMode: 'multiply',
        }}
      />
      <span className='mt-2 block truncate text-xs font-medium text-text-strong'>
        {token.name.replace(/^--/, '')}
      </span>
      <span className='mt-0.5 block font-mono text-xs text-text-subtle'>
        {copied ? '복사됨' : token.value}
      </span>

      {/* 별칭이면 무엇을 가리키는지 보여준다 — 원색을 바꿨을 때 무엇이 따라 움직이는지가 보인다 */}
      {token.isAlias && (
        <span className='mt-0.5 block truncate font-mono text-xs text-text-subtle'>
          → {token.raw.replace(/var\(|\)/g, '').replace(/^--/, '')}
        </span>
      )}

      {ratio !== null && (
        <span className='mt-1.5 flex items-center gap-1.5'>
          <span className='font-mono text-xs text-text-subtle'>
            {ratio.toFixed(2)}
          </span>
          <span
            className={
              gradeOf(ratio) === '미달'
                ? 'rounded-sm bg-destructive px-1.5 py-0.5 text-xs text-primary-foreground'
                : 'rounded-sm bg-accent px-1.5 py-0.5 text-xs text-accent-foreground'
            }
          >
            {gradeOf(ratio)}
          </span>
        </span>
      )}
    </button>
  );
};

type SwatchRowProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export const SwatchRow = ({
  title,
  description,
  children,
}: SwatchRowProps) => (
  <section className='mb-8'>
    <h3 className='text-base font-medium text-text-strong'>{title}</h3>
    {description && (
      <p className='mt-1 text-sm text-text-subtle'>{description}</p>
    )}
    <div className='mt-3 flex flex-wrap gap-2'>{children}</div>
  </section>
);

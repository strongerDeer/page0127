'use client';

import { useRef } from 'react';

import { useMeasured } from './useMeasured';

const MEASURED = ['font-size', 'line-height', 'font-weight'];

type TypeSpecimenProps = {
  /** 이 단계를 쓰는 방법 — 실제 클래스 이름 */
  className: string;
  /** 언제 쓰는지 */
  usage: string;
  /** 보여줄 문장 */
  sample: string;
};

/**
 * 타이포 한 단계. 왼쪽에 쓰는 법, 오른쪽에 실제로 그려진 모습.
 * 크기는 적어 두지 않고 렌더된 것을 되읽는다 — 창을 좁히면 숫자가 같이 바뀐다.
 */
export const TypeSpecimen = ({
  className,
  usage,
  sample,
}: TypeSpecimenProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const measured = useMeasured(ref, MEASURED);

  const size = measured['font-size']?.replace('px', '');
  const leading = measured['line-height']?.replace('px', '');
  const weight = measured['font-weight'];

  return (
    <div className='flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-line-soft py-4'>
      <div className='w-52 shrink-0'>
        <code className='text-xs text-text-strong'>{className}</code>
        <p className='mt-1 font-mono text-xs text-text-subtle'>
          {size && leading ? `${size}/${leading} · w${weight}` : '측정 중…'}
        </p>
        <p className='mt-0.5 text-xs text-text-faint'>{usage}</p>
      </div>
      <p ref={ref} className={className}>
        {sample}
      </p>
    </div>
  );
};

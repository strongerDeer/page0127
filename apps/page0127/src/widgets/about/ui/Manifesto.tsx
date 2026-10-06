'use client';

import { useEffect, useRef, useState } from 'react';

import { litCount, toWords } from '../model/wordFill';

const WORDS = toWords([
  {
    text: '다 읽고 나면 기억은 흐려지고, 기록은 메모 앱에, SNS에, 사진첩에 흩어집니다. 그래서 ',
  },
  { text: '한곳에 꽂아 두기로', key: true },
  { text: ' 했어요.' },
]);

const colorOf = (lit: boolean, key: boolean) =>
  !lit ? 'text-text-subtle/30' : key ? 'text-primary' : 'text-text-strong';

/**
 * 스크롤하는 만큼 단어가 옅은 색에서 진한 색으로 채워진다.
 *
 * 문장 전체는 처음부터 DOM 에 있으므로 스크린리더·검색엔진은 그대로 읽는다 — 색만 바뀐다.
 * 처음 값은 '전부 켜짐': 서버 HTML·JS 실패 시 옅은 문장이 남지 않게 하고,
 * 마운트 직후 실제 진행도로 내린다. reduced-motion 이면 켜진 채로 둔다.
 */
export const Manifesto = () => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lit, setLit] = useState(WORDS.length);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const update = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      // 문단 윗변이 화면 80% 지점에 닿을 때 시작해, 아래로 지나가며 끝난다
      const progress =
        (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.3);
      setLit(litCount(progress, WORDS.length));
    };
    update();
    addEventListener('scroll', update, { passive: true });
    return () => removeEventListener('scroll', update);
  }, []);

  return (
    <section
      aria-label='왜 page0127.인가요'
      className='px-4 py-40 text-center md:py-48'
    >
      <p className='text-sm font-bold text-primary'>왜 page0127.인가요</p>
      <p ref={ref} className='display-xl mx-auto mt-6 max-w-4xl text-balance'>
        {WORDS.map((w, i) => (
          <span
            key={i}
            className={`transition-colors duration-300 motion-reduce:transition-none ${colorOf(i < lit, w.key)}`}
          >
            {w.text}{' '}
          </span>
        ))}
      </p>
    </section>
  );
};

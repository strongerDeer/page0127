'use client';

import { useEffect, useState } from 'react';

/**
 * 실제로 렌더된 값을 브라우저에서 되읽는다.
 *
 * 크기를 문서에 손으로 적으면 스케일을 고쳤을 때 문서만 조용히 낡는다.
 * 게다가 타이포는 `@media` 로 값이 갈리므로(768px 에서 24→28) 적어 둔 숫자는
 * 어느 한쪽에서 반드시 틀리다. 그래서 화면에 그린 것을 그대로 읽어 보여준다.
 *
 * 창 크기를 바꾸면 다시 잰다 — Storybook 뷰포트 도구로 분기를 넘나들며 볼 수 있다.
 */
export const useMeasured = <T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  properties: string[]
): Record<string, string> => {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const measure = () => {
      const node = ref.current;
      if (!node) return;
      const computed = getComputedStyle(node);
      setValues(
        Object.fromEntries(
          properties.map((prop) => [prop, computed.getPropertyValue(prop)])
        )
      );
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // properties 는 스토리마다 고정 배열이라 참조가 매번 바뀌어도 내용은 같다.
    // 문자열로 굳혀 비교해야 매 렌더마다 리스너를 다시 걸지 않는다.
  }, [ref, properties.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return values;
};

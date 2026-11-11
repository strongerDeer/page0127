'use client';

import { useEffect, useState } from 'react';

export const LIBRARY_SECTIONS = [
  { id: 'library-shelf', label: '서재' },
  { id: 'library-record', label: '기록' },
  { id: 'library-taste', label: '취향' },
] as const;

type SectionId = (typeof LIBRARY_SECTIONS)[number]['id'];

/**
 * 서재 바로가기 탭 — 서재·기록·취향 (HJ, 2026-11-11).
 *
 * 화면을 바꾸는 탭이 아니라 "그 묶음으로 내려가는" 탭이다. 내용은 전부 펼쳐 둔 채
 * 폰에서 긴 서재를 빨리 오가게 한다. 그래서 role=tablist 가 아니라 nav + 같은 페이지 링크다
 * (연도 탭과 겹쳐 '탭 두 겹'이 되지 않는다 — 이건 이동 메뉴다).
 *
 * 지금 보는 묶음은 IntersectionObserver 로 표시한다. 헤더(64px)+이 줄 아래를 지나는
 * 묶음 가운데 가장 아래 것이 "지금"이다.
 */
export const LibrarySectionNav = () => {
  const [active, setActive] = useState<SectionId>('library-shelf');

  useEffect(() => {
    const visible = new Set<SectionId>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id as SectionId;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        // 화면 위쪽 띠에 걸친 묶음 중 문서 순서상 마지막 것
        const current = [...LIBRARY_SECTIONS]
          .reverse()
          .find((section) => visible.has(section.id));
        if (current) setActive(current.id);
      },
      // 헤더+탭 줄(약 120px) 바로 아래 ~ 화면 40% 지점 사이의 띠
      { rootMargin: '-120px 0px -60% 0px' }
    );
    for (const { id } of LIBRARY_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label='서재 바로가기'
      // 헤더(h-16) 바로 아래에 붙는다. 배경을 칠해 아래 내용이 비치지 않게
      className='sticky top-16 z-30 -mx-6 border-b border-line-soft bg-background/95 px-6 backdrop-blur md:-mx-10 md:px-10'
    >
      <ul className='flex gap-5'>
        {LIBRARY_SECTIONS.map(({ id, label }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActive(id)}
                className={`inline-flex min-h-11 items-center border-b-2 text-[15px] ${
                  isActive
                    ? 'border-primary font-bold text-text-strong'
                    : 'border-transparent text-text-subtle hover:text-text-strong'
                }`}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

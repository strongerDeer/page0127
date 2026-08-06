import { GHOST_SPINES, OG_COLORS, SPINE_GAP } from './theme';

import type { Spine } from './theme';

/**
 * 카드 바닥에 깔리는 배경 책장 — ⚠️ satori(next/og) 전용, 브라우저로 나가지 않는다
 *
 * **선반이 아니라 무늬다.** 이전에는 선반이 카드 하단의 주인공이었고 글자와 나란히
 * 놓였다. 지금은 투명도를 낮춰 뒤로 물리고, 글자는 흰 여백 위에 얹는다 —
 * 그래야 카톡 썸네일 크기로 줄어도 글자가 읽힌다.
 *
 * 책등은 left 좌표를 직접 계산해 깐다. flex 로도 같은 픽셀이 나오지만, 이쪽은
 * "몇 px 자리에 놓인다"가 코드에 그대로 적혀 있어 선반이 카드 폭을 넘는지
 * 계산으로 확인할 수 있다.
 *
 * satori는 CSS 일부만 지원하므로 shared/ui 의 컴포넌트나 Tailwind 클래스를 쓸 수
 * 없다. 인라인 style 만 쓰고, 자식이 2개 이상인 div 에는 display 를 명시한다.
 */

type BookShelfProps = {
  /** 세울 책등. spinesFor(권수)로 만들어 넘긴다. 비면 빈 자리를 그린다 */
  spines: readonly Spine[];
  /** 책장 띠의 높이 */
  height: number;
  /** 얼마나 뒤로 물릴지 */
  opacity: number;
};

/** 왼쪽부터 차례로 눕혀 각 책등의 x 좌표를 낸다 */
const layOut = (spines: readonly { w: number }[]) => {
  let x = 0;

  return spines.map((s) => {
    const left = x;
    x += s.w + SPINE_GAP;
    return left;
  });
};

export const BookShelf = ({ spines, height, opacity }: BookShelfProps) => {
  const empty = spines.length === 0;
  const drawn = empty ? GHOST_SPINES : spines;
  const offsets = layOut(drawn);

  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        // 카드 폭을 넘는 책등은 잘려 나간다 — 잘린 책등은 "책이 더 있다"로 읽힌다
        overflow: 'hidden',
        opacity,
      }}
    >
      {drawn.map((s, i) => (
        <div
          key={`${i}-${s.h}`}
          style={{
            display: 'flex',
            position: 'absolute',
            left: offsets[i],
            bottom: 0,
            width: s.w,
            // 띠가 얕은 카드(책 기록)에서는 책등도 같이 눕는다
            height: Math.min(s.h, height),
            // 책등이라 위쪽 모서리만 살짝 둥글다
            borderRadius: '4px 4px 0 0',
            ...(empty
              ? {
                  border: `2px dashed ${OG_COLORS.inkSoft}`,
                  borderBottom: 'none',
                }
              : { background: (s as Spine).c }),
          }}
        />
      ))}
    </div>
  );
};

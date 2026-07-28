import { GHOST_SPINES, OG_COLORS, SPINE_GAP } from './theme';

import type { Spine } from './theme';

/**
 * 카드 폭을 가로지르는 선반 — ⚠️ satori(next/og) 전용, 브라우저로 나가지 않는다
 *
 * 세 카드가 공유하는 형태다. 책장 카드에는 책이 꽂히고, 책 기록 카드에는 그 책
 * 한 권이 선반 위에 선다. 카드를 넘겨봐도 같은 서비스라는 것이 형태로 읽힌다.
 *
 * 왜 가로인가: 이전에는 카드 오른쪽 구석에 책등 8개를 세로로 모아 뒀는데,
 * 그건 책장이 아니라 막대그래프로 읽힌다(원래 주석도 그 걱정을 적어 두고 있었다).
 * 실제 책장은 벽면을 가로지르고, 1200×630 가로 카드에도 그 비율이 맞는다.
 *
 * 책등은 left 좌표를 직접 계산해 깐다. flex 로도 같은 픽셀이 나오지만(둘을 렌더해
 * 바이트까지 대조했다), 이쪽은 "몇 px 자리에 놓인다"가 코드에 그대로 적혀 있어
 * 선반이 카드 폭을 넘는지 계산으로 확인할 수 있다.
 *
 * satori는 CSS 일부만 지원하므로 shared/ui 의 컴포넌트나 Tailwind 클래스를 쓸 수
 * 없다. 인라인 style 만 쓰고, 자식이 2개 이상인 div 에는 display 를 명시한다.
 */

type BookShelfProps = {
  /** 세울 책등. spinesFor(권수)로 만들어 넘긴다. 비면 빈 자리를 그린다 */
  spines: readonly Spine[];
  /** 선반 위에 책 대신 놓을 것 (책 기록 카드의 표지와 정보) */
  children?: React.ReactNode;
  /** 선반 위 공간의 최소 높이. 책 기록 카드는 표지가 커서 더 필요하다 */
  minHeight?: number;
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

export const BookShelf = ({
  spines,
  children,
  minHeight = 216,
}: BookShelfProps) => {
  const empty = spines.length === 0 && !children;
  const drawn = empty ? GHOST_SPINES : spines;
  const offsets = layOut(drawn);
  const shelfWidth = drawn.reduce((sum, s) => sum + s.w + SPINE_GAP, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {children ? (
        // 책 기록 카드 — 표지와 정보가 선반 위에 나란히 선다
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            width: '100%',
            minHeight,
          }}
        >
          {children}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: shelfWidth,
            height: minHeight,
          }}
        >
          {drawn.map((s, i) => (
            <div
              key={`${i}-${s.h}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                left: offsets[i],
                bottom: 0,
                width: s.w,
                height: s.h,
                // 책등이라 위쪽 모서리만 살짝 둥글다
                borderRadius: '3px 3px 0 0',
                ...(empty
                  ? {
                      border: `2px dashed ${OG_COLORS.inkSoft}`,
                      borderBottom: 'none',
                      opacity: 0.4,
                    }
                  : { background: (s as Spine).c }),
              }}
            >
              {/* 책등에 각인된 제목 자리 — 얇은 책에는 한 줄만 들어간다 */}
              {!empty && (
                <div
                  style={{
                    width: s.w * 0.46,
                    height: 3,
                    background: OG_COLORS.paper,
                    opacity: 0.5,
                    marginBottom: 5,
                  }}
                />
              )}
              {!empty && s.w >= 38 && (
                <div
                  style={{
                    width: s.w * 0.28,
                    height: 3,
                    background: OG_COLORS.paper,
                    opacity: 0.3,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 선반 널 — 책을 받치는 면이라 책등보다 진하고 두껍다 */}
      <div
        style={{
          display: 'flex',
          height: 10,
          background: OG_COLORS.ink,
          borderRadius: 2,
        }}
      />
    </div>
  );
};

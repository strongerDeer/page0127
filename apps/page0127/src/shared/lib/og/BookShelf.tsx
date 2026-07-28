import { BOOK_SPINES, GHOST_SPINES, OG_COLORS } from './theme';

/**
 * 공유 카드에 그리는 선반 — ⚠️ satori(next/og) 전용, 브라우저로 나가지 않는다
 *
 * satori는 CSS 일부만 지원하므로 여기서는 shared/ui 의 컴포넌트를 쓸 수 없다
 * (Tailwind 클래스도 해석하지 못한다). 인라인 style만 쓴다.
 *
 * satori 제약: 자식이 2개 이상인 div 는 display 를 명시해야 한다.
 */

type BookShelfProps = {
  /** 세울 책등. spinesFor(권수)로 만들어 넘긴다 */
  spines: readonly (typeof BOOK_SPINES)[number][];
};

export const BookShelf = ({ spines }: BookShelfProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      // 책은 서로 맞닿아 꽂힌다 — 벌리면 막대그래프로 보인다
      gap: 2,
      borderBottom: `5px solid ${OG_COLORS.paper}`,
      paddingBottom: 5,
    }}
  >
    {/* 한 권도 없으면 빈 자리를 그린다 — 선반 선만 남기면 렌더가 깨진 것처럼 보인다 */}
    {spines.length === 0 &&
      GHOST_SPINES.map((s) => (
        <div
          key={s.h}
          style={{
            width: s.w,
            height: s.h,
            border: `2px dashed ${OG_COLORS.paper}`,
            borderBottom: 'none',
            opacity: 0.28,
            borderRadius: '2px 2px 0 0',
          }}
        />
      ))}

    {spines.map((s) => (
      <div
        key={s.c + s.h}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 5,
          width: s.w,
          height: s.h,
          background: s.c,
          // 책등이라 위쪽 모서리만 살짝 둥글다
          borderRadius: '2px 2px 0 0',
        }}
      >
        {/* 책등에 각인된 제목 자리 — 두 줄의 얇은 선 */}
        <div
          style={{
            width: s.w * 0.44,
            height: 3,
            background: OG_COLORS.paper,
            opacity: 0.42,
          }}
        />
        <div
          style={{
            width: s.w * 0.28,
            height: 3,
            background: OG_COLORS.paper,
            opacity: 0.24,
          }}
        />
      </div>
    ))}
  </div>
);

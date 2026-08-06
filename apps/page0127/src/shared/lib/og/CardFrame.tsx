import { BrandSymbol } from '@/shared/lib/brand/BrandSymbol';

import { BookShelf } from './BookShelf';
import { BG_SHELF, BRAND_SPINES, CARD_PADDING, OG_COLORS } from './theme';

import type { Spine } from './theme';

/**
 * 공유 카드의 바깥 틀 — ⚠️ satori(next/og) 전용
 *
 * 배경·여백·배경 책장을 한 곳에 둔다. 홈·책장·책 기록 카드가 같은 면 위에 놓여야
 * 링크를 여러 개 받아도 같은 서비스로 읽힌다.
 *
 * **가운데 정렬인 이유:** 일부 플랫폼이 1.91:1 카드를 정사각으로 잘라 쓴다.
 * 이전의 좌측 정렬에서는 오른쪽에 있던 숫자("157권")가 크롭되면 통째로 사라졌다.
 * 가운데로 모으면 어느 쪽이 잘려도 핵심이 남는다.
 */

type CardFrameProps = {
  children: React.ReactNode;
  /** 배경 책장에 세울 책등. 넘기지 않으면 꽉 찬 브랜드 책장 */
  spines?: readonly Spine[];
  /** 표지가 주인공인 카드(책 기록)는 배경 책장을 얕은 띠로 낮춘다 */
  compact?: boolean;
};

export const CardFrame = ({
  children,
  spines = BRAND_SPINES,
  compact = false,
}: CardFrameProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      background: OG_COLORS.paper,
      color: OG_COLORS.ink,
      // 폰트를 지정하지 않는다 — next/og 가 등장 글자만 Google Fonts 에서 받아온다
      fontFamily: 'sans-serif',
      padding: `${CARD_PADDING.y}px ${CARD_PADDING.x}px`,
    }}
  >
    <BookShelf
      spines={spines}
      height={compact ? BG_SHELF.compactHeight : BG_SHELF.height}
      opacity={compact ? BG_SHELF.compactOpacity : BG_SHELF.opacity}
    />

    {/* 선반 널 — 책장이 흐릿해도 바닥선은 또렷해야 "책장"으로 읽힌다 */}
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 6,
        background: OG_COLORS.line,
      }}
    />

    {/*
      내용은 배경 책장 위에 온다.

      정확히 한가운데가 아니라 **44px 위**다. 카드 정중앙에 두면 맨 아랫줄(서브 카피)이
      배경 책장 위로 30px 쯤 걸쳐 글자가 책등 무늬와 겹친다. 반대로 책장을 더 낮추면
      "책이 차오른다"는 형태가 사라진다 — 글자를 올리는 쪽이 싸다.

      표지가 세로를 꽉 채우는 책 기록 카드(compact)는 올릴 여유가 없어 정중앙에 둔다.
    */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: compact ? 0 : 88,
      }}
    >
      {children}
    </div>
  </div>
);

/**
 * 카드 상단 워드마크 — 심볼 + 글자.
 *
 * 이전에는 글자만 있었다. 심볼을 붙인 이유는 **탭의 파비콘과 같은 얼굴**을 만들기
 * 위해서다 — 링크를 눌러 들어갔을 때 탭에 뜨는 아이콘이 방금 본 미리보기와 같으면
 * 같은 서비스라는 것이 설명 없이 전달된다.
 */
export const Wordmark = ({ size = 46 }: { size?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <BrandSymbol size={size} />
    <div
      style={{
        display: 'flex',
        marginLeft: 12,
        // 심볼 높이에 비례해 글자를 맞춘다 — 카드마다 심볼 크기가 다르다
        fontSize: Math.round(size * 0.65),
        fontWeight: 700,
        color: OG_COLORS.ink,
      }}
    >
      page0127
    </div>
  </div>
);

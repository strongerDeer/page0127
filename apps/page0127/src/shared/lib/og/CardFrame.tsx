import { OG_COLORS } from './theme';

/**
 * 공유 카드의 바깥 틀 — ⚠️ satori(next/og) 전용
 *
 * 배경·여백·워드마크를 한 곳에 둔다. 홈·책장·책 기록 카드가 같은 면 위에 놓여야
 * 링크를 여러 개 받아도 같은 서비스로 읽힌다.
 *
 * 아래쪽 패딩이 0인 이유: 선반이 카드 바닥에 닿아야 벽에 붙은 책장으로 보인다.
 * 선반 널이 카드의 아래 테두리 역할도 겸한다.
 */

type CardFrameProps = {
  children: React.ReactNode;
};

export const CardFrame = ({ children }: CardFrameProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: OG_COLORS.sky,
      color: OG_COLORS.ink,
      // 폰트를 지정하지 않는다 — next/og 가 등장 글자만 Google Fonts 에서 받아온다
      fontFamily: 'sans-serif',
      padding: '52px 64px 0',
    }}
  >
    {children}
  </div>
);

/** 카드 좌상단 워드마크 */
export const Wordmark = () => (
  <div
    style={{
      display: 'flex',
      fontSize: 26,
      fontWeight: 700,
      color: OG_COLORS.skyDeep,
      // 자간을 벌려 로고처럼 읽히게 한다 — 본문과 같은 리듬이면 그냥 글자로 보인다
      letterSpacing: 1.5,
    }}
  >
    page0127
  </div>
);

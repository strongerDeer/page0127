import { renderOg } from '@/shared/lib/og/render';
import {
  STAGE_CENTER,
  STAGE_HEIGHT,
  StageCard,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

// 독서 케미 링크(/{username}/compatibility)의 공유 그림 (2026-11-27)
//
// 케미 결과의 공유 버튼이 이 주소를 보낸다. 페이지가 openGraph(제목)를 적으면 상위
// [username]/opengraph-image 그림이 지워지므로 여기 따로 둔다.
//
// 그림 = 위 가운데 슬로건 + 그 아래 가운데 **"?%" 점수 게이지**(HJ 2026-11-27 선택).
// 점수는 링크를 연 사람과 이 서재를 견줘야 나오므로 미리 알 수 없고, 공유한 사람의 실제 점수를
// 넣으면 기본이 '나만 보기'인 결과가 공개된다. 그래서 물음표로 "나와는 몇 점?"을 묻는다.
// 사람마다 같은 그림이라 조회가 없다.
//
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '독서 케미 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const CTA = '나와의 독서 케미 보기';

/** 게이지 — 슬로건 아래 가운데, 무대 바닥선에서 조금 띄운다(자르지 않는다) */
const RING = { size: 216, stroke: 18 } as const;
const RING_BOTTOM_GAP = 24;
/** 채워 보이는 비율 — 점수가 아니라 "게이지"로 읽히게 하는 장식값 */
const FILL = 0.72;

const ScoreRing = () => {
  const r = (RING.size - RING.stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        left: STAGE_CENTER - RING.size / 2,
        top: STAGE_HEIGHT - RING.size - RING_BOTTOM_GAP,
        width: RING.size,
        height: RING.size,
      }}
    >
      <svg
        width={RING.size}
        height={RING.size}
        viewBox={`0 0 ${RING.size} ${RING.size}`}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <circle
          cx={RING.size / 2}
          cy={RING.size / 2}
          r={r}
          fill='none'
          stroke='rgba(255, 255, 255, 0.22)'
          strokeWidth={RING.stroke}
        />
        {/* 12시 방향에서 시계 방향으로 채운다 */}
        <defs>
          {/* 하늘색 → 민트 — 무대 파랑 위에서 색이 돌게. 민트는 선으로만 쓴다(큰 면 X) */}
          <linearGradient id='arc' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stopColor='#bfdbfe' />
            <stop offset='100%' stopColor={OG_COLORS.mint} />
          </linearGradient>
        </defs>
        <circle
          cx={RING.size / 2}
          cy={RING.size / 2}
          r={r}
          fill='none'
          stroke='url(#arc)'
          strokeWidth={RING.stroke}
          strokeLinecap='round'
          strokeDasharray={`${c * FILL} ${c}`}
          transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}
        />
      </svg>
      {/* "?"를 원 정가운데에 두고, "%"는 그 오른쪽에 따로 붙인다 */}
      <div
        style={{
          display: 'flex',
          position: 'relative',
          color: OG_COLORS.paper,
          fontWeight: 800,
          fontSize: 100,
          lineHeight: 1,
        }}
      >
        ?
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: '100%',
            bottom: 8,
            marginLeft: 5,
            fontSize: 38,
            lineHeight: 1,
            color: OG_COLORS.mint,
          }}
        >
          %
        </div>
      </div>
    </div>
  );
};

const Image = () =>
  renderOg(
    <StageCard cta={CTA}>
      <StageSlogan lines={['책장을 맞대면,', '우리 독서 케미']} />
      <ScoreRing />
    </StageCard>
  );

export default Image;

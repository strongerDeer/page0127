import { renderOg } from '@/shared/lib/og/render';
import {
  OBJECT_TOP,
  STAGE_CENTER,
  StageCard,
  StageCrop,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

// 공지·업데이트(/updates) 공유 그림 (2026-11-27)
//
// 홈과 같은 틀(파란 무대 + 위 가운데 슬로건 + 흰 띠)에서 슬로건 아래 가운데에 **새 소식 쪽지**를 세운다.
// 쪽지 안은 글자 없이 스켈레톤(회색 막대)만 — 실제 소식 문구를 넣으면 작아서 안 읽히고,
// 미리보기 아래에 제목·설명이 따로 붙는다(HJ 2026-11-27 "실제 텍스트는 빼고 스켈레톤").
// 머리의 빨간 점은 메뉴의 새 소식 점과 같은 표시다. 아래쪽은 흰 띠에서 잘린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '공지·업데이트 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** 쪽지 폭 — 다른 카드 그림과 비슷한 크기로 읽히게 */
const NOTE_WIDTH = 414;
const BAR = '#e6ecf5';
const CHIP = '#dbe7fb';

/** 소식 한 줄 — 날짜 칩 + 제목 막대 두 줄(길이를 다르게 해야 글처럼 보인다) */
const ROWS = [
  [88, 56],
  [94, 70],
  [80, 48],
  [90, 62],
] as const;

const Bar = ({ width, height = 16 }: { width: string; height?: number }) => (
  <div
    style={{
      display: 'flex',
      width,
      height,
      borderRadius: height / 2,
      background: BAR,
    }}
  />
);

const NewsNote = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      left: STAGE_CENTER - NOTE_WIDTH / 2,
      top: OBJECT_TOP,
      width: NOTE_WIDTH,
      height: 600,
      padding: '30px 28px 0',
      borderRadius: 18,
      background: OG_COLORS.paper,
    }}
  >
    {/* 머리 — 제목 막대 + 메뉴와 같은 빨간 점 */}
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div
        style={{
          display: 'flex',
          width: 130,
          height: 26,
          borderRadius: 13,
          background: '#c9d6ea',
        }}
      />
      <div
        style={{
          display: 'flex',
          width: 14,
          height: 14,
          marginLeft: 8,
          marginTop: -6,
          borderRadius: 7,
          background: '#ef4444',
        }}
      />
    </div>

    {ROWS.map(([first, second], i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginTop: 22,
          paddingTop: 22,
          borderTop: '1.5px solid #eef2f8',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            width: 64,
            height: 28,
            borderRadius: 14,
            background: CHIP,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginLeft: 16,
            marginTop: 6,
          }}
        >
          <Bar width={`${first}%`} />
          <div style={{ display: 'flex', marginTop: 12 }}>
            <Bar width={`${second}%`} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Image = () =>
  renderOg(
    <StageCard cta='새 소식 보기'>
      <StageSlogan lines={['새로 생긴 기능과', '바뀐 점']} />
      <StageCrop>
        <NewsNote />
      </StageCrop>
    </StageCard>
  );

export default Image;

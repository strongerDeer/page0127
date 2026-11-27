import { renderOg } from '@/shared/lib/og/render';
import {
  CROP_TOP,
  STAGE_GUTTER,
  StageCard,
  StageCrop,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE, truncate } from '@/shared/lib/og/theme';

import { CHANGELOG } from '@/widgets/landing/model/siteInfo';

// 공지·업데이트(/updates) 공유 그림 (2026-11-27)
//
// 홈과 같은 틀(파란 무대 + 왼쪽 슬로건 + 흰 띠)에서 오른쪽에 **새 소식 쪽지**를 크게 세운다.
// 쪽지 머리의 빨간 점은 메뉴의 새 소식 점과 같은 표시다. 목록은 CHANGELOG 최근 3건 —
// 배포할 때마다 기록이 바뀌면 그림도 따라 바뀐다. 아래쪽은 흰 띠에서 잘린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '공지·업데이트 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const NOTE_WIDTH = 460;
const ITEMS = 3;
/** 제목 상한(한글 글자 수) — 두 줄 안에 들어가는 길이. 넘으면 말줄임 */
const TITLE_MAX = 26;

/** '2026.11.25' → '11.25' */
const shortDate = (date: string) => date.split('.').slice(1).join('.');

const NewsNote = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      right: STAGE_GUTTER,
      top: CROP_TOP,
      width: NOTE_WIDTH,
      height: 600,
      padding: '30px 32px 0',
      borderRadius: 18,
      background: OG_COLORS.paper,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          fontSize: 34,
          fontWeight: 800,
          color: OG_COLORS.ink,
          letterSpacing: -1,
        }}
      >
        새 소식
      </div>
      {/* 메뉴의 새 소식 점과 같은 빨간 점 */}
      <div
        style={{
          display: 'flex',
          width: 14,
          height: 14,
          marginLeft: 8,
          marginTop: -18,
          borderRadius: 7,
          background: '#ef4444',
        }}
      />
    </div>

    {CHANGELOG.slice(0, ITEMS).map((entry) => (
      <div
        key={`${entry.date}-${entry.title}`}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginTop: 18,
          paddingTop: 18,
          borderTop: '1.5px solid #e6ecf5',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            marginTop: 1,
            padding: '4px 12px',
            borderRadius: 14,
            background: '#e8f0fc',
            fontSize: 18,
            fontWeight: 700,
            color: OG_COLORS.accentDeep,
          }}
        >
          {shortDate(entry.date)}
        </div>
        <div
          style={{
            display: 'flex',
            flex: 1,
            marginLeft: 14,
            fontSize: 22,
            lineHeight: 1.4,
            // 한글은 어절 단위로 줄을 바꾼다 — 기본값은 '있/어요'처럼 낱자에서 끊는다
            wordBreak: 'keep-all',
            fontWeight: 700,
            color: OG_COLORS.ink,
            letterSpacing: -0.5,
          }}
        >
          {truncate(entry.title, TITLE_MAX)}
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

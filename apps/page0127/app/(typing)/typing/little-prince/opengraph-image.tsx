import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderOg } from '@/shared/lib/og/render';
import {
  STAGE_CENTER,
  STAGE_HEIGHT,
  StageCard,
  StageCrop,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

// 온라인 필사(/typing/little-prince)의 공유 그림 (2026-11-27)
//
// 이 페이지는 metadata.openGraph(제목·설명)를 직접 적는다. 그 순간 루트의
// opengraph-image 가 함께 지워져 링크 미리보기에 그림이 없었다(Next 는 openGraph 객체를
// 통째로 갈아 끼운다 — badges·books/all 에서도 같은 일을 겪었다). 파일 규칙으로 두면
// Next 가 og:image 를 알아서 붙인다.
//
// 그림은 페이지 히어로와 같은 "타자 치는 아이". satori 는 webp 를 못 읽어 PNG 사본
// (public/og/typing-hero.png)을 data URI 로 넣는다. 주소에 변수가 없어 빌드 때 한 번 그려진다.
//
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '『어린 왕자』 온라인 필사 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

/**
 * 원본 720×227 을 그대로(반전·자르기 없이) 책상 전체가 보이게 깐다
 * (HJ 2026-11-27 "자르지 말고 쭉 깔자" + 원본 그림). 책상 아랫변이 무대 바닥선에 닿는다.
 * 도트가 깨지지 않게 1.2배까지만 키운다.
 */
const SCALE = 1.2;
const HERO = { width: 720 * SCALE, height: 227 * SCALE } as const;
/** 원본에서 책상 아랫변의 y — 그 아래는 투명이라 무대 바닥선에 이 줄을 맞춘다 */
const DESK_BOTTOM = 222;

const readHero = () =>
  `data:image/png;base64,${readFileSync(
    join(process.cwd(), 'public/og/typing-hero.png')
  ).toString('base64')}`;

const Image = () =>
  renderOg(
    <StageCard cta='온라인 필사 시작하기'>
      <StageSlogan lines={['『어린 왕자』를', '한 쪽씩 따라 치기']} />

      {/* 타자 치는 아이 — 책상 전체를 가운데에 깔고, 책상 아랫변을 무대 바닥선에 맞춘다 */}
      <StageCrop>
        {/* satori 는 next/image 를 렌더하지 못한다 — 이 파일은 브라우저로 나가지 않는다 */}
        {}
        <img
          src={readHero()}
          alt=''
          width={HERO.width}
          height={HERO.height}
          style={{
            position: 'absolute',
            left: STAGE_CENTER - HERO.width / 2,
            top: STAGE_HEIGHT - DESK_BOTTOM * SCALE,
          }}
        />
      </StageCrop>
    </StageCard>
  );

export default Image;

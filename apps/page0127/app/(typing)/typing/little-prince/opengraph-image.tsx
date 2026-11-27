import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderOg } from '@/shared/lib/og/render';
import {
  COVER_OVERHANG,
  STAGE_GUTTER,
  STAGE_HEIGHT,
  StageCard,
} from '@/shared/lib/og/StageCard';
import { OG_COLORS, OG_SIZE } from '@/shared/lib/og/theme';

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

/** 원본 720×227 — 오른쪽 아래, 책상 밑면이 무대 바닥선에 걸친다 */
const HERO = { width: 720, height: 227 } as const;

const readHero = () =>
  `data:image/png;base64,${readFileSync(
    join(process.cwd(), 'public/og/typing-hero.png')
  ).toString('base64')}`;

const Image = () =>
  renderOg(
    <StageCard cta='온라인 필사 시작하기'>
      {/*
        슬로건 — 왼쪽, 무대 안에서 세로 가운데(HJ 2026-11-27). 홈 카드(BrandStage)와 같은 자리다.
        오른쪽 아래 그림은 왼쪽 위가 투명이라 글자 끝(x≈530)과 목도리(x≈590)가 겹치지 않는다.
      */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'absolute',
          left: STAGE_GUTTER,
          top: 0,
          height: STAGE_HEIGHT,
          fontSize: 68,
          fontWeight: 800,
          color: OG_COLORS.paper,
          letterSpacing: -2,
          lineHeight: 1.2,
        }}
      >
        <div>『어린 왕자』를</div>
        <div>한 쪽씩 따라 치기</div>
      </div>

      {/* 타자 치는 아이 — 책상 밑면이 무대 바닥선에 살짝 걸치게 */}
      {}
      <img
        src={readHero()}
        alt=''
        width={HERO.width}
        height={HERO.height}
        style={{
          position: 'absolute',
          right: STAGE_GUTTER - 20,
          bottom: -COVER_OVERHANG,
        }}
      />
    </StageCard>
  );

export default Image;

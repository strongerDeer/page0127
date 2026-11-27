import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderOg } from '@/shared/lib/og/render';
import {
  STAGE_GUTTER,
  STAGE_HEIGHT,
  StageCard,
  StageCrop,
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

/**
 * 원본 720×227 을 좌우로 뒤집고 1.4배 키워 책상 아래를 흰 띠에서 자른다
 * (HJ 2026-11-27 "좌우 반전, 확대해서 잘라서"). 뒤집으면 아이가 오른쪽, 등불이 왼쪽에 온다.
 * 도트 그림이라 1.4배 정도는 뭉개지지 않는다 — 더 키우면 계단이 보인다.
 */
const SCALE = 1.4;
const HERO = { width: 720 * SCALE, height: 227 * SCALE } as const;
/** 그림 왼쪽 끝 — 뒤집힌 등불이 슬로건 끝(x≈530)을 넘지 않는 자리 */
const HERO_LEFT = 330;
/** 그림 윗변 — 책상 윗면이 무대 바닥선 조금 위에 오고, 그 아래는 잘린다 */
const HERO_TOP = 210;

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

      {/* 타자 치는 아이 — 뒤집고 키워서, 책상 아래는 무대 바닥선에서 자른다 */}
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
            left: HERO_LEFT,
            top: HERO_TOP,
            transform: 'scaleX(-1)',
          }}
        />
      </StageCrop>
    </StageCard>
  );

export default Image;

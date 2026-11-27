import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderOg } from '@/shared/lib/og/render';
import { StageCard, StageCrop, StageSlogan } from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

// 배지 책장(/{username}/badges)의 공유 그림 (2026-11-27)
//
// 페이지가 openGraph(제목·설명)를 적으면 상위 [username] 의 그림이 지워진다(Next 는 openGraph 객체를
// 통째로 갈아 끼운다). 예전엔 그 자리에 서재 그림을 그대로 다시 달았는데, 서재 링크와 구별되지 않았다
// (HJ 2026-11-27 "배지는 변경해야"). 지금은 **배지 책 표지 세 권**을 부채꼴로 크게 세우고
// 아래는 흰 띠에서 자른다 — 다른 페이지 카드와 같은 문법.
//
// 표지는 배지 아트 시트(public/badges/editorial/story-art-v3.png)에서 세 칸을 오려 둔 JPEG
// (public/og/badge-*.jpg, 300×400). 시트 원본은 2.6MB 라 함수에 싣지 않는다.
// 사람마다 받은 배지는 다르지만 그림은 "배지 책장이 이렇게 생겼다"만 보여 준다 — 조회 없이 빌드 때 한 번 그린다.
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '배지 책장 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const readBadge = (n: number) =>
  `data:image/jpeg;base64,${readFileSync(
    join(process.cwd(), `public/og/badge-${n}.jpg`)
  ).toString('base64')}`;

/**
 * 가운데 책이 가장 크고 앞에, 양옆은 조금 작게 낮게 뒤에 — 기울이지 않는다.
 * satori 는 회전한 요소를 overflow 로 자르지 못해 모서리가 흰 띠로 삐져나온다.
 */
const BOOKS = [
  { n: 2, w: 250, h: 333, left: 560, top: 190 },
  { n: 3, w: 250, h: 333, left: 890, top: 190 },
  { n: 1, w: 300, h: 400, left: 700, top: 120 },
] as const;

const Image = () =>
  renderOg(
    <StageCard cta='배지 책장 구경하기'>
      <StageSlogan lines={['읽을수록', '쌓이는 배지']} />
      <StageCrop>
        {BOOKS.map((b) => (
          <div
            key={b.n}
            style={{
              display: 'flex',
              position: 'absolute',
              left: b.left,
              top: b.top,
              width: b.w,
              height: b.h,
              borderRadius: 8,
              overflow: 'hidden',
              // 그림자 없음 — satori 는 그림자를 흰 띠에서 자르지 못해 얼룩이 남는다(StageCrop 참조).
              // 겹친 책 사이는 얇은 테두리로 가른다
              border: '2px solid rgba(255, 255, 255, 0.9)',
            }}
          >
            {/* satori 는 next/image 를 렌더하지 못한다 — 이 파일은 브라우저로 나가지 않는다 */}
            {}
            <img src={readBadge(b.n)} alt='' width={b.w} height={b.h} />
          </div>
        ))}
      </StageCrop>
    </StageCard>
  );

export default Image;

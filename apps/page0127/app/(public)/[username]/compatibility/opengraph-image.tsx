import { renderOg } from '@/shared/lib/og/render';
import {
  BrandStage,
  Cover,
  StageCard,
  StageCrop,
  StageSlogan,
} from '@/shared/lib/og/StageCard';
import { OG_SIZE } from '@/shared/lib/og/theme';

import { getReaderShareData } from '@/widgets/public-library/api/getReaderShareData';

// 독서 케미 링크(/{username}/compatibility)의 공유 그림 (2026-11-27)
//
// 케미 결과의 공유 버튼이 이 주소를 보낸다. 페이지가 openGraph(제목)를 적으면 상위
// [username]/opengraph-image 그림이 지워지므로 여기 따로 둔다.
// 그림에는 "누구의 책장과 견줘 보는지"만 싣는다 — 결과(점수·문장)는 보는 사람마다 달라서
// 공개 그림에 넣을 수 없다. 예전엔 서재 카드와 같은 표지 줄이라 서재 링크와 구별되지 않았다
// (HJ 2026-11-27 "케미는 변경해야"). 지금은 왼쪽 슬로건 + 상대 책장의 표지 두 장을 서로 기대게
// 크게 세운다("책장을 맞댄다"). 아래는 흰 띠에서 잘린다.
//
// runtime 을 지정하지 않는다(= Node.js) — 이유는 app/opengraph-image.tsx 참조.

export const alt = '독서 케미 | page0127.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const CTA = '나와의 독서 케미 보기';
const SLOGAN = ['책장을 맞대면,', '우리 독서 케미'];

/** 표지 두 장 — 무대보다 길어 아래가 잘린다 */
const PAIR_COVER = { width: 250, height: 375 } as const;
const PAIR = [
  { left: 640, top: 150 },
  { left: 860, top: 110 },
] as const;

type Props = {
  params: Promise<{ username: string }>;
};

const Image = async ({ params }: Props) => {
  const { username } = await params;

  let covers: string[] = [];
  try {
    covers = (await getReaderShareData(username))?.covers ?? [];
  } catch (error) {
    console.error('케미 OG 조회 실패:', error);
  }

  // 표지가 없으면 브랜드 카드 — 빈 판형만 늘어선 무대는 깨진 이미지로 보인다
  if (covers.length === 0) {
    return renderOg(<BrandStage slogan={SLOGAN} cta={CTA} />);
  }

  return renderOg(
    <StageCard cta={CTA}>
      <StageSlogan lines={SLOGAN} />
      <StageCrop>
        {/* 두 표지를 겹쳐 맞댄다 — 기울이지 않는다(satori 는 회전한 요소를 흰 띠에서 자르지 못한다) */}
        {PAIR.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              position: 'absolute',
              left: p.left,
              top: p.top,
            }}
          >
            <Cover src={covers[i] ?? covers[0]} {...PAIR_COVER} shadow='none' />
          </div>
        ))}
      </StageCrop>
    </StageCard>
  );
};

export default Image;

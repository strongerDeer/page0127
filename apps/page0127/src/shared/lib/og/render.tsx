import { ImageResponse } from 'next/og';

import { OG_CACHE_CONTROL, OG_SIZE } from './theme';

/**
 * OG 이미지 응답 — 모든 공유 카드가 이 함수로 나간다. ⚠️ 서버 전용
 *
 * 크기·캐시 헤더·폰트를 한 곳에서 붙인다. 라우트마다 따로 적으면 한 카드만
 * 폰트가 빠지거나 캐시가 0 이 되는 식으로 어긋난다.
 */

/**
 * 사이트 본문과 같은 Pretendard 를 카드에도 쓴다.
 *
 * 폰트를 넘기지 않으면 next/og 가 등장 글자만 Google Fonts(Noto Sans)에서 받아
 * 그린다. 그때는 fontWeight 700 이 먹지 않아 제목까지 얇게 나왔고, 화면과 카드의
 * 글씨체가 달라 같은 서비스로 덜 읽혔다(2026-10-07).
 *
 * satori 는 woff2 를 못 읽어서 woff 를 쓴다(굵기당 약 1.1MB). 런타임에 받아
 * 함수 인스턴스가 살아 있는 동안 메모리에 들고 있는다 — 매 요청마다 받지 않는다.
 * 버전은 layout.tsx 의 웹 폰트(PRETENDARD_CSS)와 같은 1.3.9 로 맞춘다.
 */
const FONT_BASE =
  'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff';

const FONT_FACES = [
  { file: 'Pretendard-Medium.woff', weight: 500 },
  { file: 'Pretendard-Bold.woff', weight: 700 },
  { file: 'Pretendard-ExtraBold.woff', weight: 800 },
] as const;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 500 | 700 | 800;
  style: 'normal';
};

/** 카드의 fontFamily 로 쓰는 이름 */
export const OG_FONT_FAMILY = 'Pretendard';

let fontsPromise: Promise<OgFont[]> | null = null;

const fetchFonts = async (): Promise<OgFont[]> =>
  Promise.all(
    FONT_FACES.map(async ({ file, weight }) => {
      const res = await fetch(`${FONT_BASE}/${file}`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`${file} ${res.status}`);

      return {
        name: OG_FONT_FAMILY,
        data: await res.arrayBuffer(),
        weight,
        style: 'normal' as const,
      };
    })
  );

/**
 * 폰트를 못 받으면 빈 배열 — 카드는 next/og 기본 폰트로라도 나가야 한다.
 * 실패한 Promise 를 캐시에 남기지 않는다: 다음 요청에서 다시 시도하게 한다.
 */
const loadFonts = async (): Promise<OgFont[]> => {
  fontsPromise ??= fetchFonts();

  try {
    return await fontsPromise;
  } catch (error) {
    console.error('OG 폰트 로드 실패 — 기본 폰트로 그린다:', error);
    fontsPromise = null;
    return [];
  }
};

export const renderOg = async (element: React.ReactElement) => {
  const fonts = await loadFonts();

  return new ImageResponse(element, {
    ...OG_SIZE,
    // 빈 배열을 넘기면 기본 폰트까지 사라진다 — 없을 때는 옵션 자체를 뺀다
    ...(fonts.length > 0 ? { fonts } : {}),
    // next/og 기본값은 max-age=0 이라 크롤러가 부를 때마다 다시 그린다
    headers: { 'Cache-Control': OG_CACHE_CONTROL },
  });
};

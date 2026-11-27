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

/**
 * 받은 바이트가 온전한 WOFF 인가 — 머리(서명 'wOFF')와 머리에 적힌 전체 길이를 본다.
 *
 * 2026-11-27 CI 빌드가 "invalid length/literal"로 멈췄다. satori(opentype.js)가 WOFF 를
 * 풀다(inflate) 깨진 바이트를 만난 것이다 — 응답은 200 인데 몸통이 덜 왔거나 어긋난 경우다.
 * 정적 공유 그림 여러 장을 빌드 때 동시에 그리면서 폰트를 받는 일이 늘었다.
 * 깨진 폰트로 그리면 카드 한 장이 아니라 **빌드 전체**가 죽으므로, 미리 걸러 기본 폰트로 간다.
 */
export const isCompleteWoff = (data: ArrayBuffer): boolean => {
  if (data.byteLength < 44) return false; // WOFF 머리 크기
  const view = new DataView(data);
  const signature = view.getUint32(0); // 'wOFF' = 0x774f4646
  const declaredLength = view.getUint32(8);
  return signature === 0x774f4646 && declaredLength === data.byteLength;
};

const fetchFonts = async (): Promise<OgFont[]> =>
  Promise.all(
    FONT_FACES.map(async ({ file, weight }) => {
      const res = await fetch(`${FONT_BASE}/${file}`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`${file} ${res.status}`);

      const data = await res.arrayBuffer();
      if (!isCompleteWoff(data)) {
        throw new Error(`${file} 바이트가 온전하지 않음(${data.byteLength}B)`);
      }

      return {
        name: OG_FONT_FAMILY,
        data,
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

/**
 * 로그인한 사람만 볼 수 있는 이미지(문장 카드·케미 카드)의 캐시 — CDN 에 올리면 안 된다.
 * 같은 주소라도 쿠키(누가 부르는지)에 따라 그림이 다르거나, 남이 부르면 404 여야 한다.
 */
export const PRIVATE_IMAGE_CACHE_CONTROL = 'private, no-store';

export const renderOg = async (
  element: React.ReactElement,
  // 공유 카드는 OG 크기, 스토리 이미지는 STORY_SIZE — 폰트 규칙은 같다
  size: { width: number; height: number } = OG_SIZE,
  // 기본은 공개 캐시(1시간). 로그인한 사람만 보는 이미지는 PRIVATE_IMAGE_CACHE_CONTROL
  cacheControl: string = OG_CACHE_CONTROL
) => {
  const fonts = await loadFonts();

  return new ImageResponse(element, {
    ...size,
    // 빈 배열을 넘기면 기본 폰트까지 사라진다 — 없을 때는 옵션 자체를 뺀다
    ...(fonts.length > 0 ? { fonts } : {}),
    // next/og 기본값은 max-age=0 이라 크롤러가 부를 때마다 다시 그린다
    headers: { 'Cache-Control': cacheControl },
  });
};

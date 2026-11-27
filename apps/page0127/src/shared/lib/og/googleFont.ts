import type { OgFont } from './render';

/**
 * Google Fonts 에서 **이 글자들만** 담은 글꼴을 받는다 — OG·스토리 카드 전용. ⚠️ 서버 전용
 *
 * 한글 글꼴 전체는 수 MB 라 함수에 싣거나 매번 받기 무겁다. css2 API 의 text= 를 쓰면
 * 카드에 실제로 들어가는 글자만 담긴 작은 파일(수십 KB)을 준다(next/og 공식 예제와 같은 방법).
 * User-Agent 를 붙이지 않으면 satori 가 읽을 수 있는 TTF 주소를 돌려준다(woff2 는 못 읽는다).
 *
 * 실패하면 null — 카드는 Pretendard 로라도 나가야 한다.
 */
export const loadGoogleFont = async (
  family: string,
  weight: OgFont['weight'],
  text: string
): Promise<OgFont | null> => {
  try {
    const query = new URLSearchParams({
      family: `${family}:wght@${weight}`,
      text: [...new Set(text)].join(''),
    });
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?${query.toString()}`)
    ).text();
    const url = css.match(
      /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/
    )?.[1];
    if (!url) throw new Error('글꼴 주소를 찾지 못함');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`글꼴 ${res.status}`);
    return {
      name: family,
      data: await res.arrayBuffer(),
      weight,
      style: 'normal',
    };
  } catch (error) {
    console.error(`${family} 글꼴 로드 실패 — Pretendard 로 그린다:`, error);
    return null;
  }
};

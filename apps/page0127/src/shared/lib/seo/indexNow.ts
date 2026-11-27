/**
 * IndexNow — 페이지가 새로 생기거나 바뀌거나 지워졌을 때 검색엔진(Bing 등)에 "이 주소 다시 봐 주세요" 하고 먼저 알린다.
 *
 * 왜: 그냥 두면 검색엔진이 sitemap 을 다시 읽으러 올 때까지(며칠) 기다려야 한다.
 * 책 이야기는 배포 없이 어드민 저장 즉시 운영에 반영되므로, 저장하는 그 자리에서 알린다(HJ 2026-11-27 A안).
 *
 * 키: 사이트 주인임을 증명하는 값. public/{키}.txt 로 누구나 볼 수 있게 두는 것이 규칙이라 비밀이 아니다.
 * 키를 바꾸면 public 파일 이름·내용도 같이 바꾼다(indexNow.test.ts 가 둘이 같은지 확인한다).
 *
 * 한 엔드포인트(api.indexnow.org)에 보내면 IndexNow 에 참여한 검색엔진들이 서로 나눠 받는다.
 */
export const INDEXNOW_KEY = '41e1f9d61044d2c4939d00316430426a';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
// 핑은 부가 기능 — 오래 걸리면 포기한다(after() 안에서 돌아 화면을 막지는 않지만 함수 시간은 쓴다)
const TIMEOUT_MS = 5000;

type SubmitOptions = {
  siteUrl?: string;
  vercelEnv?: string;
  fetchImpl?: typeof fetch;
};

/**
 * 운영에서만 보낸다. 스테이징·프리뷰·로컬 주소를 검색엔진에 알리면 안 되고,
 * 키 파일도 운영 도메인에만 있어야 의미가 있다.
 */
export const shouldSubmitToIndexNow = (
  siteUrl: string | undefined,
  vercelEnv: string | undefined
): siteUrl is string =>
  vercelEnv === 'production' && !!siteUrl && siteUrl.startsWith('https://');

/** 경로('/blog/x') 또는 전체 주소를 사이트 전체 주소로 바꾸고, 다른 도메인 주소·중복은 뺀다. */
export const toIndexNowUrls = (paths: string[], siteUrl: string): string[] => {
  const origin = new URL(siteUrl).origin;
  const urls = paths.flatMap((path) => {
    try {
      const url = new URL(path, origin);
      return url.origin === origin ? [url.href] : [];
    } catch {
      return [];
    }
  });
  return [...new Set(urls)];
};

/**
 * 주소 목록을 IndexNow 에 보낸다. 실패해도 throw 하지 않는다 — 저장 같은 본 작업을 망치면 안 된다.
 * 서버 액션·라우트에서는 `after(() => submitToIndexNow([...]))` 로 응답을 보낸 뒤에 부른다.
 *
 * @returns 보냈으면 응답 상태 코드(200·202 = 받음), 안 보냈으면 null
 */
export const submitToIndexNow = async (
  paths: string[],
  {
    siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
    vercelEnv = process.env.VERCEL_ENV,
    fetchImpl = fetch,
  }: SubmitOptions = {}
): Promise<number | null> => {
  if (!shouldSubmitToIndexNow(siteUrl, vercelEnv)) return null;

  const urlList = toIndexNowUrls(paths, siteUrl);
  if (urlList.length === 0) return null;

  const { origin, host } = new URL(siteUrl);
  try {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(
        `[indexnow] 제출 거절 ${response.status} (${urlList.length}개)`
      );
    }
    return response.status;
  } catch (error) {
    console.warn(
      '[indexnow] 제출 실패:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
};

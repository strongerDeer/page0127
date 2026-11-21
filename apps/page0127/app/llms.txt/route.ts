import { buildLlmsTxt } from '@/widgets/about/model/llmsTxt';

/**
 * /llms.txt — AI가 사이트를 빠르게 이해하도록 둔 마크다운 요약 (llmstxt.org 제안 형식)
 *
 * - 공식 표준은 아니고, 주요 AI 회사가 읽는다고 밝힌 적도 없다. 비용이 거의 없어 둔다.
 * - /about 화면과 같은 원문(serviceIntro.ts)을 쓴다 → 소개 문장을 고치면 여기도 따라 바뀐다.
 * - force-static: 빌드 때 한 번 만들어 CDN 에서 내보낸다(서버 함수를 깨우지 않음).
 */
export const dynamic = 'force-static';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const GET = () =>
  new Response(buildLlmsTxt(siteUrl), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

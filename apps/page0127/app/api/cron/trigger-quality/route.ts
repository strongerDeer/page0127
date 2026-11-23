import { cronAuthResult } from '../../_helpers/cron-auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/cron/trigger-quality
 * 매주 월 아침, GitHub Actions 의 quality 워크플로를 workflow_dispatch 로 실행시킨다.
 *
 * 왜 GitHub schedule 대신 Vercel Cron 인가:
 *   이 저장소의 GitHub cron 은 붐비면 5~9시간씩 늦어지거나 아예 건너뛴다(2026-11 실측:
 *   23:00 예약인 스테이징 배포가 04~08시에 시작, 11/16 quality 예약 실행 누락, 11/23도 3시간 넘게 지연).
 *   Vercel Cron 은 지정한 시각(Hobby 는 그 1시간 안 어딘가)에 거의 확실히 호출된다.
 *
 * 이 함수는 GitHub API 를 한 번 부르고 끝난다(측정은 GitHub 러너가 한다) → CPU 수십 ms.
 *
 * 필요한 환경변수:
 *   - CRON_SECRET: Vercel Cron 인증(다른 크론과 공용)
 *   - GITHUB_DISPATCH_TOKEN: fine-grained PAT, 이 저장소 한 곳 + Actions: Read and write
 *
 * ⚠️ Vercel Cron 은 GET 으로 호출하고, 운영(Production) 배포에서만 돈다.
 */
export const dynamic = 'force-dynamic';

const REPO = 'strongerDeer/page0127';
const WORKFLOW_FILE = 'quality.yml';
const REF = 'main';

export async function GET(request: Request) {
  const auth = cronAuthResult(request);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status);
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    // 조용히 넘어가면 "측정이 왜 안 쌓이지?"를 몇 주 뒤에야 알게 된다 → 500 으로 드러낸다.
    console.error('GET /api/cron/trigger-quality: GITHUB_DISPATCH_TOKEN 이 없습니다.');
    return errorResponse('GITHUB_DISPATCH_TOKEN이 설정되지 않았습니다.', 500);
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'page0127-cron',
        },
        body: JSON.stringify({ ref: REF }),
        cache: 'no-store',
        // GitHub 가 느려도 함수가 오래 붙잡혀 있지 않게
        signal: AbortSignal.timeout(10_000),
      }
    );

    // 성공은 204 No Content. 401=토큰 만료/오타, 403=권한(Actions write) 부족, 404=저장소·파일 접근 불가
    if (res.status !== 204) {
      const detail = (await res.text()).slice(0, 300);
      console.error(`GET /api/cron/trigger-quality: GitHub ${res.status} ${detail}`);
      return errorResponse(`quality 실행 요청 실패 (GitHub ${res.status})`, 502);
    }

    return successResponse({ dispatched: true, workflow: WORKFLOW_FILE, ref: REF });
  } catch (e) {
    console.error('GET /api/cron/trigger-quality error:', e);
    return errorResponse('quality 실행 요청 중 오류가 발생했습니다.', 500);
  }
}

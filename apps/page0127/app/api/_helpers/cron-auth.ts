/**
 * 크론(cron) 요청 인증 — 순수 판정 로직 (프레임워크 의존성 없음)
 *
 * 라우트에서는 이 결과를 errorResponse로 감싸 사용한다.
 */
export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export function cronAuthResult(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;

  // 시크릿이 없을 때: 개발 환경만 통과시키고, 운영/프리뷰에서는 닫는다(fail-closed).
  // 운영에 환경변수가 빠지면 크론 라우트가 공개 API가 되는 사고를 막기 위함.
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      return { ok: true };
    }
    return {
      ok: false,
      status: 500,
      message: 'CRON_SECRET이 설정되지 않았습니다.',
    };
  }

  // 시크릿이 있으면 Vercel Cron이 붙여 보내는 Authorization 헤더를 검증한다.
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  return { ok: true };
}

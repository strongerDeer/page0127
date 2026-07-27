import { NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';

import {
  isBotUserAgent,
  parseRumBeacon,
  resolveRumEnv,
} from '../_helpers/rumBeacon';

import type { RumSample } from '@repo/quality/rum';

/**
 * POST /api/rum — 자체 RUM(실사용자 성능) 수집.
 *
 * 왜 Supabase 직접 insert가 아니라 라우트 핸들러인가:
 *   anon 키로 직접 넣게 하려면 테이블에 INSERT 정책을 열어야 하는데, 그러면 누구나
 *   임의의 값을 밀어넣어 품질 지표를 오염시킬 수 있다. 여기서 service_role로 대신 쓰면
 *   테이블은 계속 전면 거부(RLS on + 정책 없음)로 둘 수 있고, 값 검증·봇 판정·경로
 *   정규화를 서버가 강제할 수 있다.
 *
 * 응답은 항상 204(본문 없음)다. 비콘은 응답을 읽지 않고, 오류 내용을 돌려주면 공격자에게
 * 검증 규칙만 알려주는 꼴이다. 형태가 아예 잘못된 본문만 400으로 돌려준다.
 *
 * 판단 근거: apps/page0127/docs/rum-field-metrics.md
 */

// 비콘은 매 방문 발사된다 — 캐시되면 안 되고, 정적 최적화 대상도 아니다.
export const dynamic = 'force-dynamic';

const toRow = (sample: RumSample) => ({
  metric: sample.metric,
  value: sample.value,
  rating: sample.rating ?? null,
  metric_id: sample.metricId,
  route: sample.route,
  form_factor: sample.formFactor,
  browser: sample.browser,
  navigation_type: sample.navigationType ?? null,
  session_id: sample.sessionId,
  attribution: sample.attribution ?? null,
  env: sample.env,
  release: sample.release ?? null,
});

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent');

  // 봇·합성 측정(Lighthouse 포함)은 실사용자가 아니다. 저장하면 필드 지표에 랩 수치가
  // 섞여 들어가 "우리 사용자가 겪는 시간"이라는 정의가 깨진다.
  if (isBotUserAgent(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 JSON입니다.' }, { status: 400 });
  }

  const parsed = parseRumBeacon(body, {
    userAgent,
    env: resolveRumEnv(),
    // Vercel이 배포마다 주입하는 커밋 해시. 어느 배포부터 느려졌는지 가르는 데 쓴다.
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  });

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.message },
      { status: parsed.status }
    );
  }
  // 개별 샘플이 전부 걸러진 경우 — 본문 형태는 맞았으니 오류가 아니다.
  if (parsed.samples.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  // (metric, metric_id) 충돌 시 갱신. web-vitals는 같은 지표를 더 정확한 값으로 다시
  // 보고할 수 있고(bfcache 복귀 등), 그때는 **나중 값이 최종값**이라는 게 라이브러리 계약이다.
  const { error } = await createAdminClient()
    .from('quality_rum_samples')
    .upsert(parsed.samples.map(toRow), { onConflict: 'metric,metric_id' });

  if (error) {
    // 수집 실패가 사용자 경험에 영향을 주면 안 된다 — 로그만 남기고 204로 끝낸다.
    console.error('[rum] 샘플 저장 실패:', error.message);
  }

  return new NextResponse(null, { status: 204 });
}

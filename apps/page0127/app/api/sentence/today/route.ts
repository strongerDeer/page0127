import { NextResponse } from 'next/server';

import { createAnonClient } from '@/shared/config/supabase/anon';

import { getBookInfoId, sentenceBookHref } from '@/entities/daily-sentence';

import type { DailySentence } from '@/entities/daily-sentence';

/**
 * GET /api/sentence/today?key=<브라우저 열쇠> — 비회원 오늘의 문장(HJ, 2026-11-24).
 *
 * 회원은 서버 액션(drawDailySentenceAction)이 기록까지 한다. 비회원은 기록할 곳이 없어
 * DB 함수 draw_public_sentence(key) 가 "열쇠 + 오늘"로 한 문장을 정해 준다(같은 열쇠면 늘 같은 문장).
 *
 * 왜 서버 액션이 아니라 GET 라우트인가
 * - 읽기만 한다(아무것도 바꾸지 않는다) → GET 이 맞다.
 * - /api 아래라 proxy 의 IP 레이트 리밋(분당 60회)이 자동으로 걸린다 — 열쇠를 바꿔 가며 긁는 것을 늦춘다.
 * - robots.txt 가 /api 를 막고, 응답에 noindex 를 붙인다 → 문장 본문이 검색 결과에 쌓이지 않는다
 *   (권리자 요청 시 문장을 끄기 쉽게, 페이지 HTML 에는 문장을 넣지 않는다).
 */

export const dynamic = 'force-dynamic';

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex',
};

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key') ?? '';
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json(
      { error: '잘못된 요청이에요.' },
      { status: 400, headers }
    );
  }

  // 쿠키를 읽지 않는 익명 클라이언트 — 누가 부르든 같은 열쇠면 같은 답
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .rpc('draw_public_sentence', { p_key: key })
    .maybeSingle<DailySentence>();

  if (error) {
    console.error('[sentence] 비회원 오늘의 문장 실패:', error.message);
    return NextResponse.json(
      { error: '문장을 펼치지 못했어요. 다시 시도해 주세요.' },
      { status: 500, headers }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: '오늘은 펼칠 문장이 없어요.' },
      { status: 404, headers }
    );
  }

  const bookHref = sentenceBookHref(
    data,
    await getBookInfoId(supabase, data.isbn)
  );
  return NextResponse.json({ sentence: data, bookHref }, { headers });
}

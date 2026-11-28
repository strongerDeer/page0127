/**
 * AI 분석 진행 상황을 NDJSON 스트림으로 내보내는 서버 도구
 *
 * 학습 포인트:
 * - Route Handler 는 표준 Response 를 돌려준다. new Response(ReadableStream) 이면 스트리밍이다
 *   (Node 전용 res.write 없이 웹 표준 Web Streams API 만 쓴다)
 * - ReadableStream 의 start() 는 생성자 안에서 바로 불린다 → controller 를 밖에서 쓸 수 있다
 * - cancel() 은 사용자가 창을 닫거나 다른 화면으로 가서 연결이 끊길 때 불린다
 *
 * 연결이 끊겨도 분석은 끝까지 한다:
 * 횟수는 이미 예약했고 AI 비용도 나가고 있다. 여기서 멈추면 "횟수는 썼는데 결과는 없음"이 된다.
 * 그래서 보내기만 건너뛰고(send 가 조용히 무시), 작업 전체를 after() 에 맡겨
 * 응답이 끝난 뒤에도 플랫폼이 함수를 끝까지 살려 두게 한다.
 */

import { after } from 'next/server';

import {
  ANALYSIS_STREAM_CONTENT_TYPE,
  type AnalysisStreamEvent,
} from './analysisEvents';

export type SendAnalysisEvent = (event: AnalysisStreamEvent) => void;

/** 같은 진행률 줄을 너무 자주 보내지 않는다 — 1% 이상 바뀔 때만 */
const MIN_PROGRESS_STEP = 0.01;

export const streamAnalysis = (
  run: (send: SendAnalysisEvent) => Promise<void>,
  fallbackErrorMessage: string
): Response => {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  let lastRatio = -1;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
    },
  });

  const send: SendAnalysisEvent = (event) => {
    if (closed) return;
    if (event.type === 'progress') {
      if (event.ratio - lastRatio < MIN_PROGRESS_STEP) return;
      lastRatio = event.ratio;
    }
    try {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    } catch {
      // 이미 닫힌 스트림 — 연결이 끊긴 것이니 이후 보내기는 건너뛴다
      closed = true;
    }
  };

  const job = run(send)
    .catch((error: unknown) => {
      // run 이 스스로 처리하지 못한 실패 — 화면이 기다리다 멈추지 않게 오류 줄을 보낸다
      console.error('AI 분석 스트림 실패:', error);
      send({ type: 'error', message: fallbackErrorMessage });
    })
    .finally(() => {
      if (closed) return;
      closed = true;
      try {
        controller.close();
      } catch {
        // 이미 닫힘
      }
    });

  // 응답(스트림)이 끝나도, 사용자가 연결을 끊어도 job 이 끝날 때까지 함수를 살려 둔다
  after(job);

  return new Response(stream, {
    headers: {
      'Content-Type': `${ANALYSIS_STREAM_CONTENT_TYPE}; charset=utf-8`,
      // 중간 프록시가 모아서 한 번에 보내지 않게 — 줄이 생기는 대로 흘려보낸다
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
};

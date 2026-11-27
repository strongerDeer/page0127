import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

import {
  ANALYSIS_STREAM_CONTENT_TYPE,
  type AnalysisStage,
  splitNdjson,
  toOverallProgress,
} from '@/shared/lib/ai/analysisEvents';

import { isDemoReadOnlyError, notifyDemoReadOnly } from './demoReadOnly';

export type AnalysisProgress = {
  stage: AnalysisStage;
  /** 전체 진행률 0~1 */
  progress: number;
};

export type AnalysisStreamResult = { analysisId: string; cached: boolean };

const DISCONNECTED_MESSAGE =
  '연결이 끊겼어요. 잠시 뒤 결과 화면에서 확인해 주세요.';

/**
 * AI 분석 요청을 보내고, 서버가 보내는 진행 줄을 읽으며 onProgress 로 알린다.
 *
 * 학습 포인트:
 * - axios(XHR)는 응답을 조각으로 못 읽어서 여기만 fetch 를 쓴다.
 *   response.body.getReader() 로 도착하는 대로 읽고, TextDecoder 로 글자로 바꾼다
 * - 4xx(로그인·책 수·월 한도)는 스트림이 아닌 평소 JSON 으로 온다 → 다른 요청과 똑같이
 *   AxiosError 모양으로 던져서 toastApiError·체험 계정 안내가 그대로 동작하게 한다
 * - 캐시 히트(케미)는 200 + JSON 으로 바로 온다
 *
 * @throws AxiosError(4xx·5xx) 또는 Error(스트림 안의 오류 줄·연결 끊김)
 */
export const postAnalysisStream = async (
  path: string,
  body: unknown,
  onProgress: (progress: AnalysisProgress) => void
): Promise<AnalysisStreamResult> => {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('Content-Type') ?? '';

  if (!response.ok || !contentType.includes(ANALYSIS_STREAM_CONTENT_TYPE)) {
    const data: unknown = await response.json().catch(() => undefined);

    if (response.ok) {
      const json = data as { analysis_id?: string; cached?: boolean };
      if (!json?.analysis_id) throw new Error(DISCONNECTED_MESSAGE);
      return { analysisId: json.analysis_id, cached: Boolean(json.cached) };
    }

    throw toAxiosError(response, data);
  }

  if (!response.body) throw new Error(DISCONNECTED_MESSAGE);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let stage: AnalysisStage = 'analyzing';
  onProgress({ stage, progress: toOverallProgress(stage) });

  for (;;) {
    const { done, value } = await reader.read();
    // stream: true — 한글 한 글자가 두 조각에 걸쳐 와도 깨지지 않게 이어서 디코딩한다
    buffer += decoder.decode(value, { stream: !done });
    const { lines, rest } = splitNdjson(done ? `${buffer}\n` : buffer);
    buffer = rest;

    for (const event of lines) {
      switch (event.type) {
        case 'stage':
          stage = event.stage;
          onProgress({ stage, progress: toOverallProgress(stage) });
          break;
        case 'progress':
          onProgress({
            stage,
            progress: toOverallProgress(stage, event.ratio),
          });
          break;
        case 'done':
          // 남은 줄은 읽지 않는다 — 서버가 뒷정리를 하는 동안 화면은 바로 넘어간다
          void reader.cancel().catch(() => undefined);
          onProgress({ stage, progress: 1 });
          return { analysisId: event.analysisId, cached: false };
        case 'error':
          void reader.cancel().catch(() => undefined);
          throw new Error(event.message);
      }
    }

    if (done) throw new Error(DISCONNECTED_MESSAGE);
  }
};

/** fetch 응답 → 다른 요청과 같은 AxiosError 모양 (서버 문구는 data.error 로 읽힌다) */
const toAxiosError = (response: Response, data: unknown): AxiosError => {
  const axiosResponse = {
    status: response.status,
    statusText: response.statusText,
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  const error = new AxiosError(
    `Request failed with status code ${response.status}`,
    response.status >= 500
      ? AxiosError.ERR_BAD_RESPONSE
      : AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    axiosResponse
  );
  // apiClient 인터셉터와 같은 안내 — 체험 계정은 쓰기가 막혀 있다
  if (isDemoReadOnlyError(error)) notifyDemoReadOnly();
  return error;
};

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  errorResponse,
  internalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from './response';

afterEach(() => {
  vi.restoreAllMocks();
});

const spyLogs = () => ({
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
});

describe('errorResponse 로그 레벨', () => {
  /**
   * Sentry 의 captureConsoleIntegration 이 console.error 만 이슈로 만든다.
   * 이 구분이 무너지면 정상 거절(4xx)이 장애 목록을 채운다.
   */
  it('5xx는 console.error로 남긴다 — Sentry 이슈가 되어야 한다', () => {
    const log = spyLogs();

    errorResponse('서버 오류가 발생했습니다.', 500);

    expect(log.error).toHaveBeenCalledOnce();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('401은 console.warn으로만 남긴다 — 비로그인은 장애가 아니다', () => {
    const log = spyLogs();

    unauthorizedResponse();

    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it('404·400도 warn이다', () => {
    const log = spyLogs();

    notFoundResponse('책');
    errorResponse('잘못된 요청입니다.', 400);

    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledTimes(2);
  });

  it('상태 코드를 생략하면 500으로 보고 error를 남긴다', () => {
    const log = spyLogs();

    errorResponse('알 수 없는 오류');

    expect(log.error).toHaveBeenCalledOnce();
  });

  it('internalErrorResponse는 항상 error다', () => {
    const log = spyLogs();

    internalErrorResponse(new Error('DB 연결 실패'));

    expect(log.error).toHaveBeenCalledOnce();
    expect(log.warn).not.toHaveBeenCalled();
  });
});

describe('errorResponse 응답 본문', () => {
  it('상태 코드와 메시지를 그대로 싣는다', async () => {
    spyLogs();

    const response = errorResponse('로그인이 필요합니다.', 401);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: '로그인이 필요합니다.',
    });
  });
});

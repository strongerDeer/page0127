import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildNarrative, extractText } from './report';

import type { Analysis } from './analyze';

// 프롬프트에 JSON 으로 실리기만 하면 되므로 모양만 맞춘 최소 픽스처
const analysis = {
  isBaseline: false,
  sameDeployment: false,
  trend: { performance: 'flat', bundle: 'flat', weight: 'flat' },
  regressions: [],
  suppressedRegressions: [],
} as unknown as Analysis;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('extractText', () => {
  it('text 블록들을 이어 붙여 꺼낸다', () => {
    const body = {
      content: [
        { type: 'text', text: '**핵심:** 좋다.' },
        { type: 'text', text: '\n- 항목' },
      ],
    };
    expect(extractText(body)).toBe('**핵심:** 좋다.\n- 항목');
  });

  it('text 가 아닌 블록은 건너뛴다', () => {
    const body = {
      content: [
        { type: 'thinking', thinking: '...' },
        { type: 'text', text: '본문' },
      ],
    };
    expect(extractText(body)).toBe('본문');
  });

  it('모양이 다르거나 본문이 비면 null — 빈 리포트를 저장하지 않는다', () => {
    expect(extractText(null)).toBeNull();
    expect(extractText({ error: { type: 'overloaded_error' } })).toBeNull();
    expect(extractText({ content: [{ type: 'text', text: '  ' }] })).toBeNull();
  });
});

describe('buildNarrative', () => {
  it('키가 없으면 API 를 부르지 않고 이유를 남긴다', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const out = await buildNarrative(analysis);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out).toContain('ANTHROPIC_API_KEY 없음');
  });

  it('성공하면 본문을 돌려주고, 키는 헤더로만 보낸다', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: '분석 결과' }] }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchSpy);

    const out = await buildNarrative(analysis);

    expect(out).toBe('분석 결과');
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('test-key');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe(
      'test-key'
    );
  });

  it('HTTP 오류면 상태 코드를 이유로 남긴다 — 예전처럼 원인을 삼키지 않는다', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"error":{}}', { status: 401 }))
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const out = await buildNarrative(analysis);

    expect(out).toContain('HTTP 401');
  });
});

import { describe, expect, it } from 'vitest';

import { buildLlmsTxt } from './llmsTxt';
import { SERVICE_DEFINITION, SERVICE_FAQ } from './serviceIntro';

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt('https://page0127.com');

  it('제목 다음 인용 줄에 정의 문장을 둔다 (llms.txt 형식)', () => {
    const lines = text.split('\n');
    expect(lines[0]).toBe('# page0127.');
    expect(lines[2]).toBe(`> ${SERVICE_DEFINITION}`);
  });

  it('자주 묻는 질문을 모두 담는다', () => {
    for (const faq of SERVICE_FAQ) {
      expect(text).toContain(`### ${faq.question}`);
    }
  });

  it('주요 페이지 링크를 사이트 주소로 만든다', () => {
    expect(text).toContain('(https://page0127.com/about)');
    expect(text).toContain('(https://page0127.com/books/all)');
  });
});

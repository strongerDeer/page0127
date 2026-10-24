import { describe, expect, it } from 'vitest';

import { createTasteAnalysisPrompt } from './taste-analysis';

const book = (key: string, title: string, score: number | null) => ({
  key,
  title,
  author: '저자',
  category: '국내도서-소설/시/희곡',
  score,
  description: null,
  toc: null,
});

describe('createTasteAnalysisPrompt — 근거 책', () => {
  const prompt = createTasteAnalysisPrompt(
    [
      book('B1', '모순', 5),
      book('B2', '피로사회', 2),
      book('B3', '안 매긴 책', null),
    ],
    [{ name: '이야기에 사는 사람', criteria: '소설 중심' }],
    5
  );

  it('책마다 번호를 붙여 보여 준다 — 응답은 이 번호로 근거를 고른다', () => {
    expect(prompt).toContain('[B1] "모순"');
    expect(prompt).toContain('[B2] "피로사회"');
  });

  it('평가 안 한 책은 목록에 없다 — 근거로도 고를 수 없다', () => {
    expect(prompt).not.toContain('[B3]');
  });

  it('evidence 형식과 지침을 요구한다', () => {
    expect(prompt).toContain('"evidence"');
    expect(prompt).toContain('책 번호(예: "B3")를 그대로');
    expect(prompt).toContain('liked.topics 에 쓴 이름 **그대로**');
  });
});

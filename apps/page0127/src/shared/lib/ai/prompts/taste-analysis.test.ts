import { describe, expect, it } from 'vitest';

import { createTasteAnalysisPrompt } from './taste-analysis';

const book = (
  key: string,
  title: string,
  score: number | null,
  period: 'recent' | 'lasting' = 'recent'
) => ({
  key,
  period,
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

describe('createTasteAnalysisPrompt — 요즘 읽은 책 / 오래 남은 책', () => {
  const types = [{ name: '이야기에 사는 사람', criteria: '소설 중심' }];

  it('오래 남은 책은 따로 묶이고, 성향은 요즘 책 중심으로 보라고 적는다', () => {
    const prompt = createTasteAnalysisPrompt(
      [
        book('B1', '요즘 좋은 책', 5),
        book('B2', '요즘 별로인 책', 1),
        book('B3', '예전 인생책', 5, 'lasting'),
      ],
      types,
      5
    );

    const recentAt = prompt.indexOf('### 요즘 읽은 책');
    const lastingAt = prompt.indexOf('### 오래 남은 책');
    expect(recentAt).toBeGreaterThan(-1);
    expect(lastingAt).toBeGreaterThan(recentAt);
    // 예전 인생책은 "요즘 높은 점수" 칸이 아니라 오래 남은 책 칸에만 있다
    expect(prompt.indexOf('[B3]')).toBeGreaterThan(lastingAt);
    expect(prompt.indexOf('[B1]')).toBeLessThan(lastingAt);
    expect(prompt).toContain('"요즘 읽은 책"을 중심으로');
    expect(prompt).toContain('뿌리 취향');
  });

  it('오래 남은 책이 없으면 그 섹션과 지침을 빼서 책이 적은 사람은 예전 모양 그대로다', () => {
    const prompt = createTasteAnalysisPrompt(
      [book('B1', '모순', 5), book('B2', '피로사회', 2)],
      types,
      5
    );

    expect(prompt).not.toContain('### 오래 남은 책');
    expect(prompt).not.toContain('뿌리 취향');
  });
});

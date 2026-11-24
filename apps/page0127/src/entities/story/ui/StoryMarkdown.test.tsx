import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { StoryMarkdown } from './StoryMarkdown';

const SOURCE = 'source: 문화체육관광부 「2025 국민 독서실태 조사」';

const render = (
  body: string,
  props: Partial<Parameters<typeof StoryMarkdown>[0]> = {}
) => renderToStaticMarkup(<StoryMarkdown body={body} {...props} />);

describe('StoryMarkdown 차트 블록', () => {
  it('```chart 는 그림으로, 다른 코드 블록은 코드로 그린다', () => {
    const html = render(
      [
        '```chart',
        'type: bar',
        'unit: %',
        SOURCE,
        '- 학생: 94.6',
        '```',
        '',
        '```ts',
        'const a = 1;',
        '```',
      ].join('\n')
    );
    expect(html).toContain('<figure');
    expect(html).toContain('94.6%');
    expect(html).toContain('국민 독서실태 조사');
    expect(html).toContain('const a = 1;');
    expect(html).not.toContain('type: bar');
  });

  it('사람 그림은 10명을 그리고 채운 수를 글로도 알려 준다', () => {
    const html = render(
      [
        '```chart',
        'type: people',
        'value: 38.5',
        'unit: %',
        SOURCE,
        '```',
      ].join('\n')
    );
    expect(html).toContain('aria-label="10명 중 3.9명"');
  });

  it('틀린 블록: 공개 페이지는 빼고, 미리보기는 이유를 보여 준다', () => {
    const broken = '```chart\ntype: number\nvalue: 1\n```';
    expect(render(broken)).toBe('');
    expect(render(broken, { preview: true })).toContain('출처');
  });

  it('내 기록은 넘겨받은 컴포넌트로 그리고, 없으면 빼 둔다', () => {
    const body = '```chart\ntype: my-record\nrate: 38.5\n```';
    expect(render(body)).toBe('');
    expect(
      render(body, {
        renderMyRecord: (spec) => <p>내 기록 {spec.rate}</p>,
      })
    ).toContain('내 기록 38.5');
  });
});

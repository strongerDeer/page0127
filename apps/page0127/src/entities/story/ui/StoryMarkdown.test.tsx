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

describe('StoryMarkdown 제목 단계', () => {
  it('기본은 ## 을 h3 로(책 글: 페이지에 "독후감" h2 가 먼저 있다)', () => {
    const html = render('## 소제목\n\n### 작은 제목');
    expect(html).toContain('<h3');
    expect(html).toContain('<h4');
    expect(html).not.toContain('<h2');
  });

  it('headingLevel 2 면 ## 은 h2, ### 은 h3(책 없는 글)', () => {
    const html = render('## 소제목\n\n### 작은 제목', { headingLevel: 2 });
    expect(html).toContain('<h2 class="heading-2');
    expect(html).toContain('<h3 class="mt-8');
  });
});

describe('StoryMarkdown 책장 차트', () => {
  const shelf = [
    '```chart',
    'type: shelf',
    SOURCE,
    '- 성인: 38.5 / 2.4 / 6',
    '```',
  ].join('\n');

  it('읽은 사람만 볼 때 더해지는 책등은 점선이 아니라 민트로 채운다', () => {
    const html = render(shelf);
    expect(html).toContain('fill-mint');
    expect(html).not.toContain('stroke-dasharray');
    expect(html).toContain('민트 책등');
  });
});

describe('StoryMarkdown 본문 그림', () => {
  it('허용 주소 그림은 크기·캡션과 함께, <p> 안에서도 올바른 태그로 그린다', () => {
    const html = render(
      '글\n\n![키보드 위의 책](/images/stories/typing/desk.webp#1200x630 "타자 연습 그때 그 화면")'
    );
    expect(html).toContain(
      '<img src="/images/stories/typing/desk.webp#1200x630"'
    );
    expect(html).toContain('alt="키보드 위의 책"');
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="630"');
    expect(html).toContain('타자 연습 그때 그 화면');
    expect(html).not.toMatch(/<p>[^]*<(figure|div)/);
  });

  it('다른 주소 그림은 공개 페이지에서 그리지 않고, 미리보기에서는 이유를 보여 준다', () => {
    const body = '![x](https://evil.com/track.png)';
    expect(render(body)).not.toContain('<img');
    const preview = render(body, { preview: true });
    expect(preview).not.toContain('<img');
    expect(preview).toContain('공개 페이지에 나오지 않아요');
  });
});

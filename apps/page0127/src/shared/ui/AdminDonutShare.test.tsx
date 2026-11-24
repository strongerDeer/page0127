import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DonutShare } from './AdminDonutShare';

describe('DonutShare', () => {
  it('가운데 합계와 범례(이름·비율)를 그린다', () => {
    const html = renderToStaticMarkup(
      <DonutShare
        title='들어온 길'
        centerLabel='세션'
        items={[
          { key: 'a', label: '인스타그램', value: 3 },
          { key: 'b', label: '직접 방문', value: 1, hint: '주소 직접 입력' },
        ]}
      />
    );
    expect(html).toContain('>4<');
    expect(html).toContain('인스타그램');
    expect(html).toContain('75%');
    expect(html).toContain('title="직접 방문 — 주소 직접 입력"');
    // 조각 2개
    expect(html.match(/<circle/g)).toHaveLength(2);
  });

  it('값이 없으면 빈 문구', () => {
    const html = renderToStaticMarkup(
      <DonutShare title='기기' centerLabel='세션' items={[]} emptyText='없음' />
    );
    expect(html).toContain('없음');
    expect(html).not.toContain('<svg');
  });
});

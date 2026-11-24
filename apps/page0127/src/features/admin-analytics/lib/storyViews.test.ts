import { describe, expect, it } from 'vitest';

import { parseStoryViews, slugFromPath } from './storyViews';

describe('slugFromPath', () => {
  it('글 주소만 slug 로', () => {
    expect(slugFromPath('/blog/korea-reading-stats-2025')).toBe(
      'korea-reading-stats-2025'
    );
    expect(slugFromPath('/blog/korea-reading-stats-2025/')).toBe(
      'korea-reading-stats-2025'
    );
    expect(slugFromPath('/blog/%EB%8C%80%EC%98%A8%EC%8B%A4')).toBe('대온실');
  });

  it('목록·더 깊은 주소·다른 주소는 건너뛴다', () => {
    expect(slugFromPath('/blog/')).toBeNull();
    expect(slugFromPath('/blog/a/opengraph-image')).toBeNull();
    expect(slugFromPath('/books/all')).toBeNull();
  });
});

describe('parseStoryViews', () => {
  it('끝 슬래시만 다른 두 줄을 합친다', () => {
    const map = parseStoryViews([
      {
        dimensionValues: [{ value: '/blog/a' }],
        metricValues: [{ value: '10' }, { value: '4' }],
      },
      {
        dimensionValues: [{ value: '/blog/a/' }],
        metricValues: [{ value: '2' }, { value: '1' }],
      },
      {
        dimensionValues: [{ value: '/blog/' }],
        metricValues: [{ value: '99' }, { value: '9' }],
      },
    ]);
    expect(map.get('a')).toEqual({ views: 12, users: 5 });
    expect(map.size).toBe(1);
  });
});

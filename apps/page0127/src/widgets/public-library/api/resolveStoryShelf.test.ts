import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveStoryShelf } from './resolveStoryShelf';

import type { StoryShelfItem } from '@/shared/lib/og/StoryCard';

vi.mock('@/shared/lib/og/loadImage', () => ({
  loadImage: vi.fn(async (url: string) =>
    url === 'ok'
      ? { src: 'data:image/png;base64,AA', width: 30, height: 600 }
      : null
  ),
}));

afterEach(() => vi.clearAllMocks());

const spine = (src: string): StoryShelfItem => ({
  kind: 'spine',
  key: src,
  title: '모순',
  src,
  ratio: null,
  fallbackWidth: 41,
});

describe('resolveStoryShelf', () => {
  it('받은 책등은 실제 비율과 data URI 로 바뀐다', async () => {
    const [item] = await resolveStoryShelf([spine('ok')]);
    expect(item).toMatchObject({
      kind: 'spine',
      src: 'data:image/png;base64,AA',
      ratio: 0.05,
    });
  });

  it('받지 못한 책등은 두께 폭의 글자 책등이 된다 — 빈 자리가 생기지 않는다', async () => {
    const [item] = await resolveStoryShelf([spine('broken')]);
    expect(item).toEqual({
      kind: 'plain',
      key: 'broken',
      title: '모순',
      width: 41,
    });
  });

  it('표지·글자 책등은 그대로 둔다', async () => {
    const cover: StoryShelfItem = {
      kind: 'cover',
      key: 'c',
      title: '책',
      src: 'c',
    };
    expect(await resolveStoryShelf([cover])).toEqual([cover]);
  });
});

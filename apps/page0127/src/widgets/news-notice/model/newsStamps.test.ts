import { describe, expect, it } from 'vitest';

import {
  addSeenIds,
  changelogDateToIso,
  changelogToStamps,
  idsSeenOnPath,
  mergeStamps,
  pickUnseen,
  SEEN_IDS_LIMIT,
} from './newsStamps';

import type { NewsStamp } from './newsStamps';

const stamp = (over: Partial<NewsStamp>): NewsStamp => ({
  id: 'x',
  kind: 'update',
  title: '제목',
  description: null,
  href: '/updates',
  publishedAt: '2026-11-25T00:00:00+09:00',
  ...over,
});

const NOW = Date.parse('2026-11-27T12:00:00+09:00');

describe('changelogToStamps', () => {
  it('날짜를 한국 0시로, 주소가 없으면 /updates 로', () => {
    const [first] = changelogToStamps([
      { date: '2026.11.25', title: '필사가 열렸어요' },
    ]);
    expect(first).toMatchObject({
      id: 'update:2026.11.25:필사가 열렸어요',
      kind: 'update',
      href: '/updates',
      publishedAt: '2026-11-25T00:00:00+09:00',
    });
    expect(changelogDateToIso('2026.11.03')).toBe('2026-11-03T00:00:00+09:00');
  });

  it('기록에 주소가 있으면 카드가 그리로 간다', () => {
    const [first] = changelogToStamps([
      { date: '2026.11.25', title: '필사', href: '/typing/little-prince' },
    ]);
    expect(first.href).toBe('/typing/little-prince');
  });
});

describe('mergeStamps', () => {
  it('공지와 책 이야기를 최신순으로 합친다', () => {
    const merged = mergeStamps(
      [stamp({ id: 'u1', publishedAt: '2026-11-20T00:00:00+09:00' })],
      [stamp({ id: 's1', kind: 'story', publishedAt: '2026-11-24T10:00:00Z' })]
    );
    expect(merged.map((s) => s.id)).toEqual(['s1', 'u1']);
  });
});

describe('pickUnseen', () => {
  it('본 소식과 14일보다 오래된 소식은 뺀다', () => {
    const stamps = [
      stamp({ id: 'new' }),
      stamp({ id: 'seen' }),
      stamp({ id: 'old', publishedAt: '2026-11-01T00:00:00+09:00' }),
    ];
    expect(pickUnseen(stamps, ['seen'], NOW).map((s) => s.id)).toEqual(['new']);
  });
});

describe('idsSeenOnPath', () => {
  const stamps = [
    stamp({ id: 'u-plain' }),
    stamp({ id: 'u-typing', href: '/typing/little-prince' }),
    stamp({ id: 'u-blog', href: '/blog' }),
    stamp({ id: 's1', kind: 'story', href: '/blog/a' }),
    stamp({ id: 's2', kind: 'story', href: '/blog/b' }),
  ];

  it('/updates 는 공지 전부', () => {
    expect(idsSeenOnPath('/updates', stamps)).toEqual([
      'u-plain',
      'u-typing',
      'u-blog',
    ]);
  });

  it('/blog 는 책 이야기 전부 + 책 이야기로 보내는 공지', () => {
    expect(idsSeenOnPath('/blog', stamps)).toEqual(['u-blog', 's1', 's2']);
  });

  it('글 한 편·소식 주소는 그것만', () => {
    expect(idsSeenOnPath('/blog/b', stamps)).toEqual(['s2']);
    expect(idsSeenOnPath('/typing/little-prince', stamps)).toEqual([
      'u-typing',
    ]);
    expect(idsSeenOnPath('/feed', stamps)).toEqual([]);
  });
});

describe('addSeenIds', () => {
  it('새 id 만 붙이고, 새 게 없으면 같은 배열', () => {
    const prev = ['a'];
    expect(addSeenIds(prev, ['a'])).toBe(prev);
    expect(addSeenIds(prev, ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('오래된 것부터 잘라 최대 개수를 지킨다', () => {
    const prev = Array.from({ length: SEEN_IDS_LIMIT }, (_, i) => `id${i}`);
    const next = addSeenIds(prev, ['new']);
    expect(next).toHaveLength(SEEN_IDS_LIMIT);
    expect(next.at(-1)).toBe('new');
    expect(next[0]).toBe('id1');
  });
});

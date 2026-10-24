import { loadImage } from '@/shared/lib/og/loadImage';

import type { StoryShelfItem } from '@/shared/lib/og/StoryCard';

/**
 * 책등 이미지를 미리 받아 실제 비율을 채운다 — 단을 나누는 계산이 추정이 아니라 실제 폭으로 돈다.
 * 받은 바이트는 data URI 로 넘겨 satori 가 같은 이미지를 다시 받지 않게 한다.
 * 받지 못한 책등은 빈 자리가 아니라 두께 폭의 글자 책등으로 세운다.
 * (표지는 2:3 고정이라 미리 받을 필요가 없다)
 */
export const resolveStoryShelf = async (
  items: StoryShelfItem[]
): Promise<StoryShelfItem[]> =>
  Promise.all(
    items.map(async (item): Promise<StoryShelfItem> => {
      if (item.kind !== 'spine') return item;
      const image = await loadImage(item.src);
      return image
        ? { ...item, src: image.src, ratio: image.width / image.height }
        : {
            kind: 'plain',
            key: item.key,
            title: item.title,
            width: item.fallbackWidth,
          };
    })
  );

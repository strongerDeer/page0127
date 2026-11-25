import type { TypingPictureKey } from '@/entities/typing';

/**
 * 필사 쪽 아래에 보여 주는 도트 그림.
 * 원작 삽화를 따라 그리지 않는다(원작 그림·캐릭터는 재단이 상표로 관리).
 * 그림 파일은 scripts/typing-pixel-art.py 가 public/typing/pixel/ 에 만든다 — 작은 webp 를 pixelated 로 키운다.
 */
const PICTURES: Record<
  TypingPictureKey,
  { width: number; height: number; caption: string }
> = {
  hat: { width: 192, height: 72, caption: '그림 1호' },
  boa: { width: 192, height: 72, caption: '그림 2호 — 보아뱀 속의 코끼리' },
  boabeast: { width: 184, height: 80, caption: '보아뱀이 맹수를 삼키는 그림' },
  portrait: { width: 128, height: 96, caption: '어린 왕자의 초상' },
  sheep: { width: 128, height: 80, caption: '양' },
  sheep2: { width: 128, height: 80, caption: '뿔 달린 숫양' },
  sheep3: { width: 128, height: 80, caption: '너무 늙은 양' },
  box: { width: 128, height: 80, caption: '구멍 뚫린 상자' },
  baobab: { width: 160, height: 104, caption: '바오바브나무가 자란 별' },
};

export const PixelPicture = ({
  name,
  className,
}: {
  name: TypingPictureKey;
  className?: string;
}) => {
  const picture = PICTURES[name];
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 1~2KB 도트 webp, 최적화하면 오히려 번진다 */}
      <img
        src={`/typing/pixel/${name}.webp`}
        width={picture.width}
        height={picture.height}
        alt={picture.caption}
        loading='lazy'
        decoding='async'
      />
      <figcaption>{picture.caption}</figcaption>
    </figure>
  );
};

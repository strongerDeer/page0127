import type { TypingPictureKey } from '@/entities/typing';

/**
 * 필사 쪽 아래에 보여 주는 그림.
 * 원작 삽화를 따라 그리지 않는다(원작 그림·캐릭터는 재단이 상표로 관리).
 * 그림은 HJ가 만든 일러스트 시트(2026-11-25)를 잘라 배경을 투명하게 한 webp(public/typing/pixel/).
 * boabeast·portrait 는 아직 시트에 없어 scripts/typing-pixel-art.py 의 도트 그림을 쓴다.
 */
const PICTURES: Record<
  TypingPictureKey,
  { width: number; height: number; caption: string }
> = {
  hat: { width: 459, height: 158, caption: '그림 1호' },
  boa: { width: 482, height: 232, caption: '그림 2호 — 보아뱀 속의 코끼리' },
  boabeast: { width: 184, height: 80, caption: '보아뱀이 맹수를 삼키는 그림' },
  portrait: { width: 128, height: 96, caption: '어린 왕자의 초상' },
  sheep: { width: 236, height: 208, caption: '양' },
  sheep2: { width: 265, height: 236, caption: '뿔 달린 숫양' },
  sheep3: { width: 280, height: 212, caption: '너무 늙은 양' },
  box: { width: 311, height: 142, caption: '구멍 뚫린 상자' },
  baobab: { width: 350, height: 284, caption: '바오바브나무가 자란 별' },
  king: { width: 212, height: 283, caption: '첫 번째 별의 왕' },
  lamplighter: { width: 216, height: 312, caption: '가로등 켜는 사람' },
  fox: { width: 246, height: 167, caption: '여우' },
  well: { width: 300, height: 209, caption: '사막의 우물' },
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
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 webp 그대로, 이미 작게 잘라 둠 */}
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

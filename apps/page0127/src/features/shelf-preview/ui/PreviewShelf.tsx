import { CoverImage } from '@repo/ui';

import type { ShelfPick } from '../model/types';

type PreviewShelfProps = { picks: ShelfPick[] };

/** 같은 색이 줄지으면 책장이 아니라 막대그래프처럼 보인다 */
const BLANK_TONES = [
  'bg-text-subtle/40',
  'bg-primary/40',
  'bg-text-strong/30',
] as const;

const BlankSpine = ({ index }: { index: number }) => (
  <span
    className={`block h-full w-6 rounded-sm ${BLANK_TONES[index % BLANK_TONES.length]}`}
  />
);

/**
 * 고른 순서대로 책등을 세운다. 책등이 없거나 못 불러온 책은 색 막대로 선다.
 * 스크린리더는 위 그리드의 aria-pressed 로 이미 상태를 안다 → 장식으로 숨긴다.
 */
export const PreviewShelf = ({ picks }: PreviewShelfProps) => (
  <ul
    aria-hidden='true'
    className='flex h-28 items-end gap-1 overflow-x-auto border-b-8 border-accent px-1'
  >
    {picks.map((pick, i) => (
      <li
        key={pick.book.isbn}
        className='h-full shrink-0 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none'
      >
        <CoverImage
          src={pick.spineSrc}
          alt=''
          width={30}
          height={112}
          fallback={<BlankSpine index={i} />}
          className='h-full w-auto rounded-sm object-contain'
        />
      </li>
    ))}
  </ul>
);

import { CoverImage } from '@repo/ui';

import type { ShelfPick } from '../model/types';

type PreviewShelfProps = {
  picks: ShelfPick[];
  /** 책등을 누르면 그 책을 뺀다 — 묶음을 넘긴 뒤엔 그리드에서 그 표지를 다시 찾을 수 없다 */
  onRemove: (pick: ShelfPick) => void;
};

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
 * 비어 있을 때도 선반을 먼저 보여 준다 — 고르면 무엇을 얻는지가 첫 화면에 보여야 한다.
 */
export const PreviewShelf = ({ picks, onRemove }: PreviewShelfProps) => (
  <div className='relative h-36 border-b-12 border-primary/25 px-3 md:h-44'>
    {picks.length === 0 ? (
      <div className='absolute inset-x-3 top-3 bottom-2.5 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/25 text-sm text-text-subtle'>
        고른 책이 여기에 꽂혀요
      </div>
    ) : (
      <ul className='flex h-full items-end gap-1 overflow-x-auto'>
        {picks.map((pick, i) => (
          <li
            key={pick.book.isbn}
            className='h-[85%] shrink-0 animate-in fade-in slide-in-from-bottom-4 odd:h-[92%] motion-reduce:animate-none'
          >
            <button
              type='button'
              aria-label={`${pick.book.title} 빼기`}
              title={`${pick.book.title} — 눌러서 빼기`}
              onClick={() => onRemove(pick)}
              className='block h-full rounded-sm transition hover:-translate-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none'
            >
              <CoverImage
                src={pick.spineSrc}
                alt=''
                width={30}
                height={150}
                fallback={<BlankSpine index={i} />}
                className='h-full w-auto rounded-sm object-contain'
              />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

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
 * 비어 있을 때도 선반을 먼저 보여 준다 — 고르면 무엇을 얻는지가 첫 화면에 보여야 한다.
 * 스크린리더는 그리드의 aria-pressed 로 이미 상태를 안다 → 장식으로 숨긴다.
 */
export const PreviewShelf = ({ picks }: PreviewShelfProps) => (
  <div
    aria-hidden='true'
    className='relative h-36 border-b-12 border-primary/25 px-3 md:h-44'
  >
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
            <CoverImage
              src={pick.spineSrc}
              alt=''
              width={30}
              height={150}
              fallback={<BlankSpine index={i} />}
              className='h-full w-auto rounded-sm object-contain'
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);

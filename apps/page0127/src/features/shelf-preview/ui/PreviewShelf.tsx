import { CoverImage } from '@repo/ui';

import { SPINE_TONE_COLORS, spineTone } from '@/entities/book/model/spineTone';

import type { ShelfPick } from '../model/types';

type PreviewShelfProps = {
  picks: ShelfPick[];
  /** 책등을 누르면 그 책을 뺀다 — 묶음을 넘긴 뒤엔 그리드에서 그 표지를 다시 찾을 수 없다 */
  onRemove: (pick: ShelfPick) => void;
};

/**
 * 책등 이미지가 없는 책 — 서재 책장·전체 도서와 같은 규칙(책마다 고정된 밝은 색 + 세로 제목).
 * 아직 저장 전이라 책 id 가 없으므로 ISBN 으로 색을 고른다.
 */
const TextSpine = ({ isbn, title }: { isbn: string; title: string }) => (
  <span
    className='flex h-full w-6 items-center justify-center overflow-hidden rounded-sm px-0.5 py-2'
    style={{ backgroundColor: SPINE_TONE_COLORS[spineTone(isbn)] }}
  >
    <span className='h-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-medium leading-tight tracking-wide text-[#1f1d1a] [writing-mode:vertical-rl]'>
      {title}
    </span>
  </span>
);

/**
 * 고른 순서대로 책등을 세운다. 책등이 없거나 못 불러온 책은 색 + 세로 제목 책등으로 선다.
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
        {picks.map((pick) => (
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
                fallback={
                  <TextSpine isbn={pick.book.isbn} title={pick.book.title} />
                }
                className='h-full w-auto rounded-sm object-contain'
              />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

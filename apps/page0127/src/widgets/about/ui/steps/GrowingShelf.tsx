import { SafeCover } from '../SafeCover';

import type { Spine } from '../../model/stepFrame';

type GrowingShelfProps = { spines: Spine[]; count: number };

/** 대체 막대의 색 — 같은 색이 줄지으면 책장이 아니라 막대그래프처럼 보인다 */
const BLANK_TONES = [
  'bg-text-subtle/40',
  'bg-primary/40',
  'bg-text-strong/30',
] as const;

/** 책등 이미지가 없거나 못 불러온 칸 — 빈 자리 대신 색 막대를 세운다 */
const BlankSpine = ({ index }: { index: number }) => (
  <span
    className={`block h-full w-6 rounded-sm ${BLANK_TONES[index % BLANK_TONES.length]}`}
  />
);

/**
 * 실제 책등 이미지로 서는 데모 책장.
 * 링크를 걸지 않는다 — 실제 PublicBookShelf 는 책마다 그 사용자의 책 상세로 가는
 * 링크가 있어서, 데모 창에 넣으면 존재하지 않는 서재로 가는 링크가 생긴다.
 */
export const GrowingShelf = ({ spines, count }: GrowingShelfProps) => (
  <ul
    aria-hidden='true'
    className='mt-4 flex h-24 items-end gap-1 border-b-8 border-accent px-1'
  >
    {spines.map((s, i) => (
      <li
        key={s.id}
        className={`h-full origin-bottom transition duration-500 motion-reduce:transition-none ${
          i < count ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
        } ${i === count - 1 ? 'rounded-sm ring-2 ring-primary/50' : ''}`}
      >
        {s.src ? (
          <SafeCover
            src={s.src}
            alt=''
            width={26}
            height={96}
            fallback={<BlankSpine index={i} />}
            className='h-full w-auto rounded-sm object-contain'
          />
        ) : (
          <BlankSpine index={i} />
        )}
      </li>
    ))}
  </ul>
);

import type { TypingRankRow } from '@/entities/typing';

/**
 * 필사 창 위 타수 랭킹 1~3위 띠(HJ 2026-11-26 A안) — 치기 전에 "누가 몇 타"인지 먼저 보여 준다.
 * 전체 순위는 아래 랭킹 카드(#typing-ranking)로 내려간다.
 */
export const TypingRankStrip = ({ rows }: { rows: TypingRankRow[] }) => {
  // 같은 타수면 같은 순위(랭킹 카드와 같은 규칙)
  const top = rows.slice(0, 3).map((row, i, list) => ({
    row,
    rank: i > 0 && list[i - 1].value === row.value ? i : i + 1,
  }));

  return (
    <section
      aria-label='타수 랭킹 1~3위'
      className='flex flex-col gap-3 rounded-2xl border border-line-soft bg-card px-4 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-5'
    >
      <div className='flex items-center justify-between gap-3 sm:contents'>
        <h2 className='shrink-0 text-sm font-bold text-text-strong'>
          🏆 타수 랭킹
        </h2>
        <a
          href='#typing-ranking'
          className='shrink-0 text-xs text-text-subtle underline-offset-2 hover:underline sm:order-last sm:ml-auto'
        >
          전체 순위 보기
        </a>
      </div>

      {top.length === 0 ? (
        <p className='text-sm text-text-subtle'>
          아직 아무도 없어요. 정확도 95% 이상으로 끝까지 쓰면 첫 번째 이름이
          돼요!
        </p>
      ) : (
        <ol className='grid grid-cols-3 gap-2 sm:flex sm:gap-6'>
          {top.map(({ row, rank }, i) => (
            <li
              key={i}
              className='flex min-w-0 flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2'
            >
              <span className='flex min-w-0 items-baseline gap-1.5 text-sm'>
                <span className='font-bold tabular-nums text-primary'>
                  {rank}
                </span>
                <span
                  className={`truncate ${row.isMe ? 'font-bold text-text-strong' : 'text-text-body'}`}
                >
                  {row.nickname}
                  {row.isMe && ' (나)'}
                </span>
              </span>
              <span className='text-sm font-bold tabular-nums text-text-strong'>
                {row.value}타
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

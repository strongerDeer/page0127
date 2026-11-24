import { adminInk } from '@/shared/lib/admin/adminChartColors';

import type { AdminSentence } from '../api/getAdminSentences';
import type { DrawStats } from '../lib/drawStats';

type SentenceDrawStatsProps = {
  /** null = 조회 실패 */
  stats: DrawStats | null;
  sentences: AdminSentence[] | null;
};

const Tile = ({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) => (
  <div className='rounded-lg border border-line p-3'>
    <p className='text-xs text-text-subtle'>{label}</p>
    <p className='mt-1 flex items-baseline gap-2 text-2xl font-bold tabular-nums text-text-strong'>
      {value}
      {children}
    </p>
    {hint && <p className='mt-0.5 text-[11px] text-text-subtle'>{hint}</p>}
  </div>
);

/**
 * "사람들이 뽑기를 쓰나?" — 문장 목록 위 요약 (HJ, 2026-11-24 S2).
 * 숫자 4칸 → 최근 7일 하루 막대 → 최근 4주 많이 뽑힌 문장 TOP 5.
 * 막대는 HTML 로 그린다(값이 0~수십이라 축이 필요 없고, 서버에서 그려져 JS 가 없다).
 */
export const SentenceDrawStats = ({
  stats,
  sentences,
}: SentenceDrawStatsProps) => {
  if (!stats) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
        뽑기 기록을 불러오지 못했습니다. (아무도 안 뽑은 것과는 다른 상태예요 —
        서버 로그를 확인하세요.)
      </p>
    );
  }
  const diff = stats.weekDraws - stats.prevWeekDraws;
  const active = sentences?.filter((s) => s.is_active) ?? [];
  const neverDrawn = active.filter((s) => s.draw_count === 0).length;
  const maxDay = Math.max(0, ...stats.daily.map((d) => d.count));
  const textOf = new Map(sentences?.map((s) => [s.id, s]) ?? []);

  return (
    <section className='mb-6 space-y-3' aria-label='뽑기 현황'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <Tile label='최근 7일 뽑기' value={`${stats.weekDraws}회`}>
          <span
            className={`text-xs font-medium ${
              diff > 0
                ? 'text-[#0f9e74] dark:text-[#34d399]'
                : diff < 0
                  ? 'text-[#6a49ee] dark:text-[#a993f7]'
                  : 'text-text-subtle'
            }`}
            title='그 전 7일 대비'
          >
            {diff > 0 ? '▲' : diff < 0 ? '▼' : '―'} {Math.abs(diff)}
          </span>
        </Tile>
        <Tile
          label='최근 7일 뽑은 사람'
          value={`${stats.weekDrawers}명`}
          hint='같은 사람은 한 번 · 운영자 제외'
        />
        <Tile label='최근 4주 뽑은 사람' value={`${stats.monthDrawers}명`} />
        <Tile
          label='아직 안 뽑힌 문장'
          value={`${neverDrawn}개`}
          hint={`활성 ${active.length}개 중`}
        />
      </div>

      <div className='grid gap-3 lg:grid-cols-2'>
        <div className='rounded-lg border border-line p-4'>
          <p className='text-sm font-medium'>하루 뽑기 (최근 7일)</p>
          <ol className='mt-3 flex h-28 items-end gap-2'>
            {stats.daily.map((d, i) => {
              const isToday = i === stats.daily.length - 1;
              return (
                <li
                  key={d.date}
                  className='flex h-full flex-1 flex-col items-center justify-end gap-1'
                >
                  <span className='text-[11px] tabular-nums text-text-subtle'>
                    {d.count}
                  </span>
                  <span
                    className='w-full rounded-t'
                    style={{
                      // 0 인 날도 바닥 선은 보이게
                      height: `${maxDay > 0 ? Math.max((d.count / maxDay) * 70, 2) : 2}%`,
                      backgroundColor: isToday
                        ? adminInk.mint
                        : adminInk.primary,
                    }}
                  />
                  <span className='text-[10px] tabular-nums text-text-subtle'>
                    {isToday ? '오늘' : d.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className='rounded-lg border border-line p-4'>
          <p className='text-sm font-medium'>많이 뽑힌 문장 (최근 4주)</p>
          {stats.top.length === 0 ? (
            <p className='mt-3 text-xs text-text-subtle'>
              최근 4주 동안 뽑힌 문장이 없어요.
            </p>
          ) : (
            <ol className='mt-2 divide-y divide-line'>
              {stats.top.map((t, i) => {
                const s = textOf.get(t.sentenceId);
                return (
                  <li
                    key={t.sentenceId}
                    className='flex items-center gap-3 py-1.5 text-sm'
                  >
                    <span className='w-4 shrink-0 text-xs tabular-nums text-text-subtle'>
                      {i + 1}
                    </span>
                    <span className='min-w-0 flex-1 truncate' title={s?.text}>
                      {s ? s.text : '(지워진 문장)'}
                      {s && (
                        <span className='ml-1.5 text-xs text-text-subtle'>
                          {s.book_title}
                        </span>
                      )}
                    </span>
                    <span className='shrink-0 text-xs font-medium tabular-nums'>
                      {t.count}회
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};

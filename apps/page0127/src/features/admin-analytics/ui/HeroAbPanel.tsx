import { HERO_AB_MIN_USERS, type HeroAbRow } from '../lib/gaEvents';

import type { DateRange } from '@/shared/lib/admin/dateRange';

type HeroAbPanelProps = {
  range: DateRange;
  /** null = GA 에 사용자 범위 측정기준 hero_variant 가 없어 못 받음 */
  rows: HeroAbRow[] | null;
};

const n = (v: number) => v.toLocaleString('ko-KR');

/** 첫 단계(히어로 봄) 대비 — 첫 단계가 0 이면 비율을 쓰지 않는다 */
const ofFirst = (value: number, first: number) =>
  first > 0 ? `${Math.round((value / first) * 100)}%` : '—';

/**
 * 홈 히어로 A/B — 같은 기간 안에서 A(읽은 책 고르기)와 B(인생책 찾기)의 단계별 사용자 수.
 * 설계: docs/superpowers/specs/2026-10-23-life-book-hero-ab-design.md
 */
export const HeroAbPanel = ({ range, rows }: HeroAbPanelProps) => {
  if (rows === null) {
    return (
      <div className='rounded-lg border border-line p-4'>
        <div className='mb-2 text-sm font-medium'>홈 히어로 A/B</div>
        <p className='text-xs text-text-subtle'>
          GA 관리 &gt; 맞춤 정의에 <b>사용자 범위</b> 측정기준{' '}
          <code>hero_variant</code> 를 등록해야 보입니다. 등록한 날부터
          쌓입니다.
        </p>
      </div>
    );
  }

  const [first] = rows;
  const tooFew =
    !first || first.a < HERO_AB_MIN_USERS || first.b < HERO_AB_MIN_USERS;
  const empty = rows.every((r) => r.a === 0 && r.b === 0);

  return (
    <div className='overflow-x-auto rounded-lg border border-line p-4'>
      <div className='mb-2 flex flex-wrap items-baseline justify-between gap-2'>
        <div className='text-sm font-medium'>홈 히어로 A/B</div>
        <span className='text-xs text-text-subtle'>
          {range.label} · 사용자 수 (히어로 본 사람 대비)
        </span>
      </div>

      {empty ? (
        <p className='text-xs text-text-subtle'>
          이 기간에 실험 데이터가 없습니다. Vercel 환경 변수{' '}
          <code>HERO_AB=on</code> 일 때만 그룹이 나뉩니다.
        </p>
      ) : (
        <>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-line text-xs text-text-subtle'>
                <th className='px-2 py-1.5 text-left font-normal'>단계</th>
                <th className='px-2 py-1.5 text-right font-normal'>
                  A 읽은 책 고르기
                </th>
                <th className='px-2 py-1.5 text-right font-normal'>
                  B 인생책 찾기
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className='border-b border-line/60'>
                  <td className='px-2 py-1.5'>
                    {r.label}
                    <span className='ml-1 font-mono text-[11px] text-text-subtle'>
                      {r.name}
                    </span>
                  </td>
                  <td className='px-2 py-1.5 text-right tabular-nums'>
                    {n(r.a)}{' '}
                    <span className='text-xs text-text-subtle'>
                      ({ofFirst(r.a, first.a)})
                    </span>
                  </td>
                  <td className='px-2 py-1.5 text-right tabular-nums'>
                    {n(r.b)}{' '}
                    <span className='text-xs text-text-subtle'>
                      ({ofFirst(r.b, first.b)})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tooFew && (
            <p className='mt-2 text-xs text-text-subtle'>
              아직 판단하기 이릅니다 — 한쪽이라도 히어로를 본 사람이{' '}
              {HERO_AB_MIN_USERS}명 미만입니다.
            </p>
          )}
        </>
      )}
    </div>
  );
};

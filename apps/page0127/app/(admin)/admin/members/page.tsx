import Link from 'next/link';

import { toKstDateKey } from '@/shared/lib/date';

import { getAccountDeletions } from '@/features/admin-members/api/getAccountDeletions';
import {
  DEFAULT_PAGE_SIZE,
  getMembers,
} from '@/features/admin-members/api/getMembers';
import {
  MEMBER_SORTS,
  type MemberSort,
  parseMemberSort,
} from '@/features/admin-members/lib/memberList';
import { providerLabel } from '@/features/admin-members/lib/memberStats';
import { MemberTable } from '@/features/admin-members/ui/MemberTable';

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const rawPage = Number(sp.page ?? '1');
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const sort = parseMemberSort(sp.sort);
  const [{ rows, total, excluded, visited }, deletions] = await Promise.all([
    getMembers({ search: sp.q, sort, page }),
    getAccountDeletions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  // 검색어(q)·정렬(sort)을 유지하며 URL을 만든다. 정렬을 바꾸면 1페이지로 돌아간다.
  const hrefFor = (p: number, s: MemberSort = sort) => {
    const params = new URLSearchParams();
    if (sp.q) params.set('q', sp.q);
    if (s !== 'joined') params.set('sort', s);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/admin/members?${qs}` : '/admin/members';
  };
  const hrefForPage = (p: number) => hrefFor(p);

  return (
    <section>
      <h1 className='mb-4 text-base font-medium'>회원 관리</h1>

      {/* 실제 회원 기준 숫자 — 테스트·체험·운영자는 뺀다(어드민 홈 지표와 같은 기준) */}
      {!sp.q && (
        <dl className='mb-4 grid max-w-md grid-cols-3 gap-3'>
          <MemberStat
            label='회원'
            value={total}
            hint='테스트·체험·운영자 제외'
          />
          <MemberStat
            label='7일 내 접속'
            value={visited?.week ?? null}
            hint='오늘 포함 7일'
          />
          <MemberStat
            label='30일 내 접속'
            value={visited?.month ?? null}
            hint='오늘 포함 30일'
          />
        </dl>
      )}

      {/* GET 폼 — 검색은 URL 쿼리로. client 컴포넌트 불필요 */}
      <form className='mb-4' action='/admin/members' method='get'>
        {sort !== 'joined' && <input type='hidden' name='sort' value={sort} />}
        <input
          name='q'
          defaultValue={sp.q ?? ''}
          placeholder='이메일 또는 닉네임 검색'
          className='w-full max-w-xs rounded border border-line px-3 py-2 text-sm'
        />
      </form>

      {/* 정렬 — 링크라 서버 컴포넌트 그대로, URL 로 공유·새로고침해도 유지된다 */}
      <nav className='mb-3 flex flex-wrap gap-1.5' aria-label='정렬'>
        {MEMBER_SORTS.map((s) => (
          <Link
            key={s.value}
            href={hrefFor(1, s.value)}
            aria-current={s.value === sort ? 'true' : undefined}
            className={`rounded-full border px-3 py-1 text-xs ${
              s.value === sort
                ? 'border-text-strong text-text-strong'
                : 'border-line text-text-subtle hover:bg-accent'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className='mb-2 text-xs text-text-subtle'>
        {sp.q ? `검색 결과 ${total}명` : `회원 ${total}명`}
        {deletions && ` · 탈퇴 ${deletions.total}명`} · 페이지당{' '}
        {DEFAULT_PAGE_SIZE}명 · 번호는 가입 순서(1번이 첫 가입자)
      </div>
      <MemberTable rows={rows} />

      {totalPages > 1 && (
        <nav className='mt-4 flex items-center justify-between text-sm'>
          {page > 1 ? (
            <Link
              href={hrefForPage(page - 1)}
              className='rounded border border-line px-3 py-1.5 hover:bg-accent'
            >
              이전
            </Link>
          ) : (
            <span className='rounded border border-line px-3 py-1.5 text-text-subtle opacity-50'>
              이전
            </span>
          )}
          <span className='text-text-subtle'>
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={hrefForPage(page + 1)}
              className='rounded border border-line px-3 py-1.5 hover:bg-accent'
            >
              다음
            </Link>
          ) : (
            <span className='rounded border border-line px-3 py-1.5 text-text-subtle opacity-50'>
              다음
            </span>
          )}
        </nav>
      )}

      {excluded.length > 0 && (
        <section className='mt-8'>
          <h2 className='mb-1 text-sm font-medium'>
            테스트·체험·운영자 계정 ({excluded.length}개)
          </h2>
          <p className='mb-3 text-xs text-text-subtle'>
            회원 수·접속자 수·어드민 홈 지표에서 빠지는 계정이에요. 테스트
            표시는 회원 상세에서 켜고 끌 수 있어요.
          </p>
          <MemberTable rows={excluded} />
        </section>
      )}

      <DeletionList deletions={deletions} />
    </section>
  );
}

const MemberStat = ({
  label,
  value,
  hint,
}: {
  label: string;
  /** null 이면 조회 실패 */
  value: number | null;
  hint: string;
}) => (
  <div className='rounded-lg border border-line p-3'>
    <dt className='text-xs text-text-subtle'>{label}</dt>
    <dd className='mt-0.5 text-xl font-bold tabular-nums text-text-strong'>
      {value === null ? '—' : `${value.toLocaleString('ko-KR')}명`}
    </dd>
    <dd className='text-[11px] text-text-subtle'>{hint}</dd>
  </div>
);

const daysBetweenIso = (from: string, to: string) =>
  Math.max(
    0,
    Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
  );

/** 탈퇴 기록 — 누구였는지는 남기지 않는다(개인정보 삭제). 언제·얼마나 쓰다 떠났는지만 */
const DeletionList = ({
  deletions,
}: {
  deletions: Awaited<ReturnType<typeof getAccountDeletions>>;
}) => (
  <section className='mt-8'>
    <h2 className='mb-1 text-sm font-medium'>
      탈퇴 기록{deletions ? ` (${deletions.total}명)` : ''}
    </h2>
    <p className='mb-3 text-xs text-text-subtle'>
      2026-10-31부터 남깁니다. 탈퇴하면 개인정보를 지워야 해서 누구였는지는
      남기지 않고, 언제·얼마나 쓰다 떠났는지만 봅니다.
    </p>
    {deletions === null ? (
      <p className='text-sm text-text-subtle'>
        탈퇴 기록을 불러오지 못했습니다.
      </p>
    ) : deletions.recent.length === 0 ? (
      <p className='text-sm text-text-subtle'>아직 탈퇴한 회원이 없어요.</p>
    ) : (
      <table className='w-full border-collapse text-sm'>
        <thead>
          <tr className='border-b border-line text-left text-text-subtle'>
            <th className='py-2'>탈퇴일</th>
            <th className='py-2'>가입일</th>
            <th className='py-2'>쓴 기간</th>
            <th className='py-2'>등록 책</th>
            <th className='py-2'>가입 경로</th>
          </tr>
        </thead>
        <tbody>
          {deletions.recent.map((d, i) => (
            <tr key={`${d.deletedAt}-${i}`} className='border-b border-line'>
              <td className='py-2'>{toKstDateKey(new Date(d.deletedAt))}</td>
              <td className='py-2'>
                {d.signedUpAt ? toKstDateKey(new Date(d.signedUpAt)) : '-'}
              </td>
              <td className='py-2'>
                {d.signedUpAt
                  ? `${daysBetweenIso(d.signedUpAt, d.deletedAt)}일`
                  : '-'}
              </td>
              <td className='py-2'>{d.bookCount}권</td>
              <td className='py-2'>{providerLabel(d.provider)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);

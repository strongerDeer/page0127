'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, Input, Spinner, StatePanel } from '@repo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { toKstDateKey } from '@/shared/lib/date';
import { QueryErrorState } from '@/shared/ui/QueryErrorState';

import { useBulkAction } from '../model/useBulkAction';
import { BulkConfirmDialog } from './BulkConfirmDialog';

import type { BookBulkAction, BulkRequest } from '../model/types';
import type { Book } from '@/entities/book';

type RecordItem = Pick<
  Book,
  | 'id'
  | 'title'
  | 'author'
  | 'status'
  | 'is_public'
  | 'read_count'
  | 'created_at'
  | 'completed_date'
  | 'completed_year'
>;
const statusNames = {
  reading: '읽는 중',
  completed: '완독',
  want_to_read: '읽고 싶어요',
};
const actionNames = {
  public: '공개로 변경',
  private: '비공개로 변경',
  delete: '삭제',
};
const initialFilters = {
  status: 'all',
  visibility: 'all',
  year: '',
  search: '',
  page: 0,
};

export const LibraryManagement = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<BulkRequest | null>(null);
  const bulk = useBulkAction('books');
  const query = useQuery({
    queryKey: ['library-management', userId, filters],
    queryFn: async () =>
      (
        await apiClient.get<{ records: RecordItem[]; total: number }>(
          `/books/manage?${new URLSearchParams({ ...filters, page: String(filters.page) })}`
        )
      ).data,
  });
  const records = query.data?.records ?? [];
  const changeFilters = (next: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 0 }));
    setSelected(new Set());
  };
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const choose = (action: BookBulkAction) => {
    bulk.clearError();
    setConfirmation({
      requestId: crypto.randomUUID(),
      action,
      ids: [...selected],
    });
  };
  const confirm = async () => {
    if (!confirmation) return;
    const result = await bulk.run(confirmation);
    if (!result) return;
    toast.success(
      `${result.count}개 독서 기록을 ${confirmation.action === 'delete' ? '삭제했어요.' : confirmation.action === 'public' ? '공개로 바꿨어요.' : '비공개로 바꿨어요.'}`
    );
    setConfirmation(null);
    setSelected(new Set());
    // Always return to a real page even if the last page was deleted.
    setFilters((current) => ({ ...current, page: 0 }));
    await queryClient.invalidateQueries({
      queryKey: ['library-management', userId],
    });
    await Promise.all(
      ['books', 'activities', 'notifications'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    );
    router.refresh();
  };
  return (
    <div className='space-y-5'>
      <form
        className='grid grid-cols-2 items-end gap-3 rounded-2xl border border-line-soft bg-card p-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto]'
        onSubmit={(event) => {
          event.preventDefault();
          changeFilters({ search: search.trim(), year });
        }}
      >
        <label className='col-span-2 min-w-0 text-sm sm:col-span-1'>
          제목·저자
          <Input
            className='mt-1'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={200}
          />
        </label>
        <label className='text-sm'>
          등록 연도
          <Input
            className='mt-1 w-full'
            type='number'
            min={1000}
            max={9999}
            placeholder='전체'
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </label>
        <Button variant='outline' type='submit'>
          검색
        </Button>
        <label className='text-sm'>
          독서 상태
          <select
            className='mt-1 block w-full min-w-0 rounded-lg border border-line bg-card px-2 py-2'
            value={filters.status}
            onChange={(event) => changeFilters({ status: event.target.value })}
          >
            <option value='all'>전체 상태</option>
            <option value='completed'>완독</option>
            <option value='reading'>읽는 중</option>
            <option value='want_to_read'>읽고 싶어요</option>
          </select>
        </label>
        <label className='text-sm'>
          공개 범위
          <select
            className='mt-1 block w-full min-w-0 rounded-lg border border-line bg-card px-2 py-2'
            value={filters.visibility}
            onChange={(event) =>
              changeFilters({ visibility: event.target.value })
            }
          >
            <option value='all'>공개·비공개 전체</option>
            <option value='public'>공개</option>
            <option value='private'>비공개</option>
          </select>
        </label>
      </form>
      <p className='text-sm text-text-body'>
        같은 책도 회독별로 표시해요. 선택하지 않은 다른 회독과 연도의 기록은
        바뀌지 않아요.
      </p>
      <div
        role='group'
        aria-label='서재 일괄 관리'
        className='flex flex-wrap items-center gap-2 rounded-xl border border-line-soft bg-card p-3'
      >
        <span role='status' className='mr-auto text-sm font-medium'>
          {selected.size}개 기록 선택
        </span>
        <Button
          size='sm'
          variant='ghost'
          disabled={!records.length || query.isFetching || bulk.pending}
          onClick={() =>
            setSelected(
              selected.size === records.length
                ? new Set()
                : new Set(records.map((record) => record.id))
            )
          }
        >
          {records.length > 0 && selected.size === records.length
            ? '선택 해제'
            : '이 페이지 모두 선택'}
        </Button>
        {(['public', 'private', 'delete'] as const).map((action) => (
          <Button
            key={action}
            size='sm'
            variant={action === 'delete' ? 'destructive' : 'outline'}
            disabled={!selected.size || bulk.pending || query.isFetching}
            onClick={() => choose(action)}
          >
            {actionNames[action]}
          </Button>
        ))}
      </div>
      {query.isPending ? (
        <Spinner label='서재 기록을 불러오는 중' className='py-10' />
      ) : query.isError ? (
        <QueryErrorState
          message='서재 기록을 불러오지 못했어요.'
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : !records.length ? (
        <StatePanel message='조건에 맞는 독서 기록이 없어요.' />
      ) : (
        <>
          <p className='text-sm text-text-subtle'>
            총 {query.data.total}개 기록 · {filters.page + 1}페이지
          </p>
          <ul className='divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-card'>
            {records.map((record) => (
              <li key={record.id} className='flex items-start gap-3 p-4'>
                <input
                  type='checkbox'
                  className='mt-1 size-4 shrink-0 accent-primary'
                  aria-label={`${record.title} ${record.read_count}회독 선택`}
                  checked={selected.has(record.id)}
                  disabled={bulk.pending}
                  onChange={() => toggle(record.id)}
                />
                <div className='min-w-0 flex-1'>
                  <Link
                    className='break-words text-sm font-medium text-text-strong hover:underline [overflow-wrap:anywhere]'
                    href={`/books/${record.id}`}
                  >
                    {record.title}
                  </Link>
                  <p className='text-xs text-text-body'>
                    {record.author || '저자 미상'} ·{' '}
                    {statusNames[record.status]} · {record.read_count}회독
                  </p>
                  <p className='text-xs text-text-subtle'>
                    등록 {toKstDateKey(new Date(record.created_at))}
                    {record.completed_date
                      ? ` · 완독 ${record.completed_date}`
                      : record.completed_year
                        ? ` · ${record.completed_year}년 완독`
                        : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs ${record.is_public ? 'bg-sunken text-text-body' : 'bg-accent text-accent-foreground'}`}
                >
                  {record.is_public ? '공개' : '비공개'}
                </span>
              </li>
            ))}
          </ul>
          <div className='flex justify-between gap-3'>
            <Button
              variant='outline'
              disabled={!filters.page || query.isFetching || bulk.pending}
              onClick={() => changeFilters({ page: filters.page - 1 })}
            >
              이전 페이지
            </Button>
            <Button
              variant='outline'
              disabled={
                (filters.page + 1) * 50 >= query.data.total ||
                query.isFetching ||
                bulk.pending
              }
              onClick={() => changeFilters({ page: filters.page + 1 })}
            >
              다음 페이지
            </Button>
          </div>
        </>
      )}
      <BulkConfirmDialog
        open={!!confirmation}
        title={
          confirmation
            ? `${confirmation.ids.length}개 독서 기록을 ${actionNames[confirmation.action as BookBulkAction]}할까요?`
            : ''
        }
        description={
          <>
            {confirmation?.action === 'delete'
              ? '선택한 기록의 평점·리뷰·메모와 연결된 댓글·좋아요도 삭제되며 복구할 수 없어요.'
              : '독서 기록은 그대로 보존해요. 비공개 기록은 이 화면의 공개 범위 필터에서 다시 공개할 수 있어요.'}
            <br />
            {records
              .filter((record) => confirmation?.ids.includes(record.id))
              .slice(0, 3)
              .map((record) => record.title)
              .join(', ')}
            {(confirmation?.ids.length ?? 0) > 3 ? ' 외 선택한 기록' : ''}
          </>
        }
        actionLabel={
          confirmation
            ? actionNames[confirmation.action as BookBulkAction]
            : '확인'
        }
        destructive={confirmation?.action === 'delete'}
        pending={bulk.pending}
        error={bulk.error}
        onClose={() => setConfirmation(null)}
        onConfirm={() => void confirm()}
      />
    </div>
  );
};

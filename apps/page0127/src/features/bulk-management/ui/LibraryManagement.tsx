'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  StatePanel,
} from '@repo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { toKstDateKey } from '@/shared/lib/date';
import { QueryErrorState } from '@/shared/ui/QueryErrorState';

import { useBulkAction } from '../model/useBulkAction';
import { BulkConfirmDialog } from './BulkConfirmDialog';
import { SelectionBar, SelectionBarDivider } from './SelectionBar';

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
const actionIcons = { public: Globe, private: Lock };
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<BulkRequest | null>(null);
  const bulk = useBulkAction('books');
  const query = useQuery({
    queryKey: ['library-management', userId, filters],
    queryFn: async () =>
      (
        await apiClient.get<{
          records: RecordItem[];
          total: number;
          years: number[];
        }>(
          `/books/manage?${new URLSearchParams({ ...filters, page: String(filters.page) })}`
        )
      ).data,
  });
  const records = query.data?.records ?? [];
  // 연도 목록은 응답에서 받는다. 첫 응답 전에도 고른 연도는 보이게 끼워 둔다
  const years =
    query.data?.years ?? (filters.year ? [Number(filters.year)] : []);
  const filterSelects = [
    {
      key: 'status',
      label: '독서 상태',
      options: [
        { value: 'all', label: '전체 상태' },
        { value: 'completed', label: '완독' },
        { value: 'reading', label: '읽는 중' },
        { value: 'want_to_read', label: '읽고 싶어요' },
      ],
    },
    {
      key: 'visibility',
      label: '공개 범위',
      options: [
        { value: 'all', label: '전체 범위' },
        { value: 'public', label: '공개' },
        { value: 'private', label: '비공개' },
      ],
    },
    {
      key: 'year',
      label: '등록 연도',
      options: [
        { value: 'all', label: '전체 연도' },
        ...years.map((value) => ({
          value: String(value),
          label: `${value}년`,
        })),
      ],
    },
  ] as const;
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
  const actionDisabled = !selected.size || bulk.pending || query.isFetching;
  return (
    <div className='space-y-5'>
      {/* 네이티브 select·number 입력은 사파리에서 높이·화살표가 제각각이라
          공통 Select(Radix) 로 맞춘다. 셀렉트는 고르는 즉시 적용, 검색어만 버튼으로 */}
      <div className='space-y-3 rounded-2xl border border-line-soft bg-card p-4'>
        <form
          className='flex items-end gap-2'
          onSubmit={(event) => {
            event.preventDefault();
            changeFilters({ search: search.trim() });
          }}
        >
          <label className='min-w-0 flex-1 text-sm'>
            제목·저자
            <Input
              className='mt-1'
              type='search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={200}
            />
          </label>
          <Button variant='outline' type='submit'>
            검색
          </Button>
        </form>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
          {filterSelects.map(({ key, label, options }) => (
            <div key={key} className='min-w-0 text-sm'>
              <span id={`manage-filter-${key}`}>{label}</span>
              <Select
                value={filters[key] || 'all'}
                onValueChange={(value) =>
                  changeFilters({
                    [key]: key === 'year' && value === 'all' ? '' : value,
                  })
                }
              >
                <SelectTrigger
                  aria-labelledby={`manage-filter-${key}`}
                  className='mt-1 w-full'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
      <p className='text-sm text-text-body'>
        같은 책도 회독별로 표시해요. 선택하지 않은 다른 회독과 연도의 기록은
        바뀌지 않아요.
      </p>
      <SelectionBar
        label='서재 일괄 관리'
        toggleAllLabel='이 페이지 모두 선택'
        countLabel={`${selected.size}개 기록 선택`}
        selectedCount={selected.size}
        selectableCount={records.length}
        toggleAllDisabled={query.isFetching || bulk.pending}
        onToggleAll={() =>
          setSelected(
            selected.size === records.length
              ? new Set()
              : new Set(records.map((record) => record.id))
          )
        }
      >
        {(['public', 'private'] as const).map((action) => {
          const Icon = actionIcons[action];
          return (
            <Button
              key={action}
              size='sm'
              variant='outline'
              className='flex-1 sm:flex-none'
              disabled={actionDisabled}
              onClick={() => choose(action)}
            >
              <Icon className='size-4' aria-hidden />
              {/* 좁은 화면에선 "로 변경"을 숨기되 읽어 주는 이름은 그대로 둔다.
                  한 span 으로 묶어야 버튼의 gap 이 글자 사이에 끼지 않는다 */}
              <span>
                {action === 'public' ? '공개' : '비공개'}
                <span className='max-sm:sr-only'>로 변경</span>
              </span>
            </Button>
          );
        })}
        <SelectionBarDivider />
        <Button
          size='sm'
          variant='destructive'
          className='flex-1 sm:flex-none'
          disabled={actionDisabled}
          onClick={() => choose('delete')}
        >
          <Trash2 className='size-4' aria-hidden />
          삭제
        </Button>
      </SelectionBar>
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
          <ul
            aria-label='독서 기록'
            className='divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-card'
          >
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
                {/* 공개는 서비스 색으로, 비공개는 회색으로 한 발 물러나 보이게 */}
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs ${record.is_public ? 'bg-accent text-accent-foreground' : 'bg-sunken text-text-body'}`}
                >
                  {record.is_public ? (
                    <Globe className='size-3' aria-hidden />
                  ) : (
                    <Lock className='size-3' aria-hidden />
                  )}
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

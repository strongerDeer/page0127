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

import type { BulkRequest } from '../model/types';
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
type ManageData = { records: RecordItem[]; total: number; years: number[] };
const statusNames = {
  reading: '읽는 중',
  completed: '완독',
  want_to_read: '읽고 싶어요',
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
  // 확인창은 되돌릴 수 없는 삭제에만 쓴다. 공개 범위는 되돌리기 토스트로 충분하다
  const [confirmation, setConfirmation] = useState<BulkRequest | null>(null);
  const bulk = useBulkAction('books');
  const queryKey = ['library-management', userId, filters];
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      (
        await apiClient.get<ManageData>(
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
  const patchVisibility = (ids: string[], isPublic: boolean) =>
    queryClient.setQueryData<ManageData>(queryKey, (data) =>
      data
        ? {
            ...data,
            records: data.records.map((record) =>
              ids.includes(record.id)
                ? { ...record, is_public: isPublic }
                : record
            ),
          }
        : data
    );
  const refreshOtherViews = () =>
    Promise.all(
      ['books', 'activities', 'notifications'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    );
  /**
   * 공개 범위 바꾸기 — 배지 하나든 선택한 여러 개든 같은 길로.
   * 1) 화면을 먼저 바꾸고(낙관적 업데이트) 2) 서버에 보낸 뒤
   * 3) 실패하면 원래대로, 성공하면 "되돌리기" 토스트를 띄운다.
   * 이미 그 상태인 기록은 보내지 않는다.
   */
  const changeVisibility = async (
    targets: RecordItem[],
    isPublic: boolean,
    isUndo = false
  ) => {
    const changing = targets.filter((record) => record.is_public !== isPublic);
    if (!changing.length) return;
    const ids = changing.map((record) => record.id);
    patchVisibility(ids, isPublic);
    const result = await bulk.run({
      requestId: crypto.randomUUID(),
      action: isPublic ? 'public' : 'private',
      ids,
    });
    if (!result) {
      patchVisibility(ids, !isPublic);
      toast.error('공개 범위를 바꾸지 못했어요. 다시 시도해주세요.');
      return;
    }
    if (!isUndo) setSelected(new Set());
    const subject =
      changing.length === 1
        ? `'${changing[0].title}' 기록`
        : `${changing.length}개 기록`;
    const state = isPublic ? '공개' : '비공개';
    if (isUndo) toast.success(`${subject}을 다시 ${state}로 돌렸어요.`);
    else
      toast.success(`${subject}을 ${state}로 바꿨어요.`, {
        action: {
          label: '되돌리기',
          onClick: () =>
            void changeVisibility(
              changing.map((record) => ({ ...record, is_public: isPublic })),
              !isPublic,
              true
            ),
        },
      });
    await refreshOtherViews();
  };
  const askDelete = () => {
    bulk.clearError();
    setConfirmation({
      requestId: crypto.randomUUID(),
      action: 'delete',
      ids: [...selected],
    });
  };
  const confirmDelete = async () => {
    if (!confirmation) return;
    const result = await bulk.run(confirmation);
    if (!result) return;
    toast.success(`${result.count}개 독서 기록을 삭제했어요.`);
    setConfirmation(null);
    setSelected(new Set());
    // Always return to a real page even if the last page was deleted.
    setFilters((current) => ({ ...current, page: 0 }));
    await queryClient.invalidateQueries({
      queryKey: ['library-management', userId],
    });
    await refreshOtherViews();
    router.refresh();
  };
  const selectedRecords = records.filter((record) => selected.has(record.id));
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
        오른쪽 공개·비공개 배지를 누르면 바로 바뀌어요. 같은 책도 회독별로 따로
        바뀌어요.
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
              // 고른 기록이 모두 이미 그 상태면 누를 일이 없다
              disabled={
                actionDisabled ||
                selectedRecords.every(
                  (record) => record.is_public === (action === 'public')
                )
              }
              onClick={() =>
                void changeVisibility(selectedRecords, action === 'public')
              }
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
          onClick={askDelete}
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
                {/* 배지를 누르면 바로 바뀐다. 공개는 서비스 색, 비공개는 회색으로
                    한 발 물러나 보이게. 눌리는 것임을 테두리·hover 로 알린다 */}
                <button
                  type='button'
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${record.is_public ? 'border-accent bg-accent text-accent-foreground hover:border-primary/40' : 'border-line bg-sunken text-text-body hover:border-text-subtle'}`}
                  aria-label={`${record.title} ${record.read_count}회독: ${record.is_public ? '공개' : '비공개'}. 누르면 ${record.is_public ? '비공개' : '공개'}로 바꿔요`}
                  disabled={bulk.pending}
                  onClick={() =>
                    void changeVisibility([record], !record.is_public)
                  }
                >
                  {record.is_public ? (
                    <Globe className='size-3' aria-hidden />
                  ) : (
                    <Lock className='size-3' aria-hidden />
                  )}
                  {record.is_public ? '공개' : '비공개'}
                </button>
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
            ? `${confirmation.ids.length}개 독서 기록을 삭제할까요?`
            : ''
        }
        description={
          <>
            선택한 기록의 평점·리뷰·메모와 연결된 댓글·좋아요도 삭제되며 복구할
            수 없어요.
            <br />
            {records
              .filter((record) => confirmation?.ids.includes(record.id))
              .slice(0, 3)
              .map((record) => record.title)
              .join(', ')}
            {(confirmation?.ids.length ?? 0) > 3 ? ' 외 선택한 기록' : ''}
          </>
        }
        actionLabel='삭제'
        destructive
        pending={bulk.pending}
        error={bulk.error}
        onClose={() => setConfirmation(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
};

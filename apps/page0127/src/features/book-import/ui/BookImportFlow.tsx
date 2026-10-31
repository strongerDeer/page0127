'use client';

import { useId, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  BookCover,
  Button,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@repo/ui';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { resolveSpineImageUrl } from '@/shared/lib/spineImage';

import { BACKGROUND_SPINE_TIMEOUT_MS } from '@/entities/book';

import { bookImportApi } from '../api/bookImportApi';
import { decodeTextFile } from '../model/decodeTextFile';
import { MATCH_BATCH_SIZE, MAX_IMPORT_ROWS } from '../model/limits';
import { parseImportText } from '../model/parseImportText';
import {
  countStates,
  pickedBook,
  type ReviewItem,
  type ReviewState,
  reviewStates,
  selectedItems,
  toImportPayload,
  toReviewItems,
} from '../model/review';

import type { MatchResponse, MatchResult } from '../model/types';
import type { BookStatus, ProviderBook } from '@/entities/book';

type Step = 'input' | 'matching' | 'review' | 'saving';

const EXAMPLE = [
  '제목, 저자, 읽은 날짜, 별점',
  '팩트풀니스, 한스 로슬링, 2024-03-05, 5',
  '불편한 편의점, 김호연, 2024.07, 4',
  '9788936434120',
].join('\n');

const STATUS_LABEL: Record<BookStatus, string> = {
  completed: '읽은 책 (완독)',
  reading: '읽는 중',
  want_to_read: '읽고 싶은 책',
};

const STATE_LABEL: Record<Exclude<ReviewState, 'ready'>, string> = {
  choose: '어떤 책인지 골라 주세요',
  notFound: '찾지 못했어요',
  existing: '이미 서재에 있어요',
  duplicate: '위에서 같은 책을 골랐어요',
};

/**
 * 표·CSV 로 책 여러 권을 한 번에 담는 흐름
 *
 * 단계: 붙여넣기/파일 → 책 찾기(20줄씩) → 확인 화면 → 한 번에 담기
 *
 * 학습 포인트:
 * - 확인 화면을 건너뛰지 않는다. 제목만으로 찾으면 해설서·개정판이 섞여 나올 수 있어
 *   사용자가 한 번 훑어보는 단계가 정확도의 마지막 방어선이다
 * - 책등 이미지는 확인 화면이 열리는 순간 브라우저에서 미리 확인해 둔다.
 *   사용자가 목록을 훑는 동안 끝나므로 "담기"를 눌렀을 때 기다릴 일이 거의 없다
 */
export const BookImportFlow = () => {
  const router = useRouter();
  const ids = { text: useId(), file: useId(), status: useId() };

  const [step, setStep] = useState<Step>('input');
  const [text, setText] = useState('');
  const [source, setSource] = useState<'paste' | 'file'>('paste');
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [existing, setExisting] = useState<MatchResponse['existing']>({
    isbns: [],
    providerItemIds: [],
  });
  const [defaultStatus, setDefaultStatus] = useState<BookStatus>('completed');
  const spineChecks = useRef(new Map<string, Promise<string | null>>());

  const parsed = useMemo(() => parseImportText(text), [text]);
  const states = useMemo(
    () => reviewStates(items, existing),
    [items, existing]
  );
  const counts = countStates(states);
  const selected = selectedItems(items, states);
  const hasRowStatus = items.some((item) => item.row.status !== null);

  const checkSpine = (book: ProviderBook) => {
    if (!spineChecks.current.has(book.isbn)) {
      // 확인 화면을 보는 동안 뒤에서 돈다 — 모바일 데이터에서는 3초로 모자라 책등이 빠졌다(#345)
      spineChecks.current.set(
        book.isbn,
        resolveSpineImageUrl(book.spineImage, BACKGROUND_SPINE_TIMEOUT_MS)
      );
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setText(decodeTextFile(await file.arrayBuffer()));
      setSource('file');
    } catch {
      toast.error('파일을 읽지 못했어요. CSV 파일인지 확인해 주세요.');
    }
  };

  const handleMatch = async () => {
    const { rows, truncated } = parsed;
    if (rows.length === 0) return;
    if (truncated > 0) {
      toast.info(
        `한 번에 ${MAX_IMPORT_ROWS}권까지 담을 수 있어요. 나머지 ${truncated}권은 다음에 담아 주세요.`
      );
    }

    setStep('matching');
    setProgress(0);
    const results: MatchResult[] = [];
    const found: MatchResponse['existing'] = { isbns: [], providerItemIds: [] };
    try {
      // 차례로 보낸다 — 묶음을 한꺼번에 쏘면 서버 쪽 공급자 호출이 겹쳐 한도를 넘는다
      for (let start = 0; start < rows.length; start += MATCH_BATCH_SIZE) {
        const batch = rows.slice(start, start + MATCH_BATCH_SIZE);
        const response = await bookImportApi.match(
          batch.map(({ title, author, isbn }) => ({ title, author, isbn }))
        );
        results.push(...response.results);
        found.isbns.push(...response.existing.isbns);
        found.providerItemIds.push(...response.existing.providerItemIds);
        setProgress(Math.round(((start + batch.length) / rows.length) * 100));
      }
    } catch {
      toast.error('책을 찾는 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.');
      setStep('input');
      return;
    }

    const next = toReviewItems(rows, results);
    next.forEach((item) => {
      const book = pickedBook(item);
      if (book) checkSpine(book);
    });
    setItems(next);
    setExisting(found);
    setStep('review');
  };

  const updateItem = (index: number, patch: Partial<ReviewItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const handlePick = (index: number, value: string) => {
    const picked = Number(value);
    const book = items[index].candidates[picked];
    if (book) checkSpine(book);
    updateItem(index, { picked, excluded: false });
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setStep('saving');
    try {
      // 확인 화면을 보는 동안 대부분 끝나 있다. 남은 것도 한 장당 최대 10초다
      const spineOk = new Map<string, boolean>();
      await Promise.all(
        selected.map(async (item) => {
          const book = pickedBook(item)!;
          checkSpine(book);
          spineOk.set(book.isbn, !!(await spineChecks.current.get(book.isbn)));
        })
      );
      const payload = toImportPayload(
        selected,
        defaultStatus,
        (book) => spineOk.get(book.isbn) ?? false
      );
      const result = await bookImportApi.importBooks(payload);

      trackEvent('book_import', {
        source,
        rows: items.length,
        selected: payload.length,
        ...result,
      });

      if (result.added > 0) {
        toast.success(`${result.added}권을 서재에 꽂았어요.`);
      }
      const notAdded = result.skipped + result.failed;
      if (notAdded > 0) {
        toast.info(
          `${notAdded}권은 담지 못했어요. 이미 서재에 있거나 책 정보를 불러오지 못했어요.`
        );
      }
      router.push('/books');
    } catch {
      toast.error('책을 담지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      setStep('review');
    }
  };

  if (step === 'input' || step === 'matching') {
    const matching = step === 'matching';
    return (
      <div className='space-y-6'>
        <div className='space-y-2 text-sm text-text-subtle'>
          <p>
            엑셀·구글 시트에서 표를 복사해 붙여넣거나 CSV 파일을 올려 주세요. 한
            줄에 한 권, 최대 {MAX_IMPORT_ROWS}권까지 담을 수 있어요.
          </p>
          <p>
            <span className='font-medium text-text-strong'>제목</span>만 있어도
            되고, 저자·ISBN·읽은 날짜·별점·한줄평·상태 열이 있으면 같이 옮겨요.
            첫 줄에 열 이름(제목, 저자…)을 적어 주면 순서는 상관없어요.
          </p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor={ids.text}>책 목록</Label>
          <Textarea
            id={ids.text}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSource('paste');
            }}
            placeholder={EXAMPLE}
            rows={10}
            disabled={matching}
            className='min-h-48 text-sm'
          />
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <label
              htmlFor={ids.file}
              className='cursor-pointer text-sm text-text-subtle underline underline-offset-4'
            >
              CSV 파일 올리기
              <input
                id={ids.file}
                type='file'
                accept='.csv,.tsv,.txt,text/csv,text/plain'
                className='sr-only'
                disabled={matching}
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            {parsed.rows.length > 0 && (
              <p className='text-sm text-text-subtle'>
                {parsed.rows.length}권을 읽었어요
                {parsed.truncated > 0 &&
                  ` (나머지 ${parsed.truncated}권은 다음에)`}
              </p>
            )}
          </div>
        </div>

        {matching ? (
          <div className='space-y-2'>
            <Progress value={progress} aria-label='책 찾는 중' />
            <p className='text-center text-sm text-text-subtle'>
              책을 찾고 있어요… {progress}%
            </p>
          </div>
        ) : (
          <Button
            className='w-full'
            onClick={handleMatch}
            disabled={parsed.rows.length === 0}
          >
            {parsed.rows.length > 0
              ? `${parsed.rows.length}권 찾기`
              : '책 찾기'}
          </Button>
        )}
      </div>
    );
  }

  const saving = step === 'saving';
  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <p className='text-base font-medium text-text-strong'>
          {items.length}권 중 {counts.ready}권을 찾았어요
        </p>
        <p className='text-sm text-text-subtle'>
          {[
            counts.choose > 0 && `골라야 할 책 ${counts.choose}권`,
            counts.notFound > 0 && `못 찾은 책 ${counts.notFound}권`,
            counts.existing > 0 && `이미 서재에 있는 책 ${counts.existing}권`,
          ]
            .filter(Boolean)
            .join(' · ') || '모두 찾았어요. 맞는지 한 번만 훑어봐 주세요.'}
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor={ids.status}>
          {hasRowStatus
            ? '상태가 적혀 있지 않은 책은'
            : '모두 어떤 책으로 담을까요?'}
        </Label>
        <Select
          value={defaultStatus}
          onValueChange={(value) => setDefaultStatus(value as BookStatus)}
          disabled={saving}
        >
          <SelectTrigger id={ids.status} className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as BookStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className='divide-y divide-line-soft border-y border-line'>
        {items.map((item, index) => (
          <ReviewRow
            key={item.row.line}
            item={item}
            state={states[index]}
            disabled={saving}
            onToggle={(checked) => updateItem(index, { excluded: !checked })}
            onPick={(value) => handlePick(index, value)}
          />
        ))}
      </ul>

      <div className='flex flex-col gap-2 sm:flex-row-reverse'>
        <Button
          className='sm:flex-1'
          onClick={handleSave}
          disabled={saving || selected.length === 0}
        >
          {saving ? '담는 중…' : `${selected.length}권 서재에 담기`}
        </Button>
        <Button
          variant='outline'
          onClick={() => setStep('input')}
          disabled={saving}
        >
          목록 고치기
        </Button>
      </div>
    </div>
  );
};

type ReviewRowProps = {
  item: ReviewItem;
  state: ReviewState;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
  onPick: (value: string) => void;
};

/**
 * 확인 화면 한 줄 — 표에 적힌 값과 찾은 책을 나란히 둔다.
 * 사용자가 "이 줄이 이 책이 맞나"를 바로 비교할 수 있어야 한다.
 */
const ReviewRow = ({
  item,
  state,
  disabled,
  onToggle,
  onPick,
}: ReviewRowProps) => {
  const checkId = useId();
  const pickId = useId();
  const book = pickedBook(item);
  const ready = state === 'ready';
  const typed = [item.row.title || item.row.isbn, item.row.author]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className='flex items-start gap-3 py-3.5'>
      <input
        id={checkId}
        type='checkbox'
        checked={ready && !item.excluded}
        disabled={!ready || disabled}
        onChange={(e) => onToggle(e.target.checked)}
        className='mt-1 h-4 w-4 shrink-0'
        aria-label={`${book?.title ?? typed} 담기`}
      />
      {book ? (
        <BookCover
          src={book.coverImage}
          title={book.title}
          decorative
          size='xs'
        />
      ) : (
        <div
          className='book-cover-box h-16 shrink-0 rounded bg-sunken'
          aria-hidden
        />
      )}

      <div className='min-w-0 flex-1 space-y-1'>
        <label htmlFor={checkId} className='block'>
          <span className='block truncate text-sm font-medium text-text-strong'>
            {book?.title ?? typed}
          </span>
          {book && (
            <span className='block truncate text-xs text-text-subtle'>
              {book.author} · {book.publisher}
            </span>
          )}
        </label>
        <p className='truncate text-xs text-text-subtle'>
          표 {item.row.line}번째 줄: {typed}
        </p>
        {state !== 'ready' && (
          <p
            className={`text-xs ${state === 'choose' ? 'font-medium text-text-strong' : 'text-text-subtle'}`}
          >
            {STATE_LABEL[state]}
            {state === 'notFound' && ' — 도서 추가에서 직접 검색해 주세요.'}
          </p>
        )}
        {item.candidates.length > 1 && (
          <Select
            value={item.picked === null ? undefined : String(item.picked)}
            onValueChange={onPick}
            disabled={disabled}
          >
            <SelectTrigger
              id={pickId}
              size='sm'
              className='w-full'
              aria-label='다른 책 고르기'
            >
              <SelectValue placeholder='후보에서 고르기' />
            </SelectTrigger>
            <SelectContent>
              {item.candidates.map((candidate, i) => (
                <SelectItem key={`${candidate.isbn}-${i}`} value={String(i)}>
                  {candidate.title} · {candidate.author} ({candidate.publisher})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </li>
  );
};

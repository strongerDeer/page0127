'use client';

import { useEffect, useId, useReducer, useRef } from 'react';

import { Button } from '@repo/ui';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@repo/ui';
import { BookCover } from '@repo/ui';
import {
  BookOpen,
  CalendarCheck,
  CalendarPlus,
  Globe,
  Lock,
  NotebookPen,
  Quote,
  RefreshCw,
  Star,
  Tag,
} from 'lucide-react';

import { toKstDateKey } from '@/shared/lib/date';

import {
  type BookRating,
  type BookStatus,
  type CompletedPrecision,
  isValidCompletedYear,
  MIN_COMPLETED_YEAR,
  type ProviderBook,
} from '@/entities/book';

import { RatingPicker } from './RatingPicker';

type BookRegistrationFormProps = {
  book: ProviderBook;
  onSubmit: (formData: BookFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<BookFormData>;
  initialStatus?: BookStatus;
  // 수정 모드에서만 전달 — 있을 때만 "책 선택부터 다시" 버튼을 보여준다
  onReselectBook?: () => void;
};

export type BookFormData = {
  status: BookStatus;
  // 날짜 / 연도만 / 모름 중 하나만 찬다. 수정에서 바꾸면 반대쪽을 null 로 지운다
  completed_date?: string | null;
  completed_year?: number | null;
  start_date?: string;
  rating?: BookRating;
  is_life_book?: boolean;
  one_line_review?: string;
  personal_memo?: string;
  tags?: string[];
  is_public?: boolean;
};

// ─── State 타입 정의 ───────────────────────────────────────────────
// 폼의 모든 입력 상태를 하나의 객체로 관리
export type FormState = {
  status: BookStatus;
  // 완독 시점을 얼마나 아는가 — 인생책처럼 오래전에 읽은 책은 날짜를 모른다
  completedPrecision: CompletedPrecision;
  completedDate: string;
  // 입력 중인 값이라 문자열로 둔다. 제출할 때 숫자로 바꿔 검증한다
  completedYear: string;
  completedYearError: string;
  startDate: string;
  showStartDate: boolean;
  rating: BookRating | undefined;
  // 인생책 = 최고점(5)의 별칭. 배타 선택이라 다른 점수를 고르면 자동으로 풀린다
  isLifeBook: boolean;
  oneLineReview: string;
  personalMemo: string;
  tagsInput: string;
  tagError: string;
  isPublic: boolean;
};

// ─── Action 타입 정의 ──────────────────────────────────────────────
// useReducer를 쓰는 핵심 이유:
//   SET_STATUS 액션 하나로 status 변경 + showStartDate/startDate 초기화를
//   원자적으로 처리 → useState였다면 set 3번 필요
type FormAction =
  | { type: 'SET_STATUS'; status: BookStatus }
  | { type: 'SET_COMPLETED_PRECISION'; precision: CompletedPrecision }
  | { type: 'SET_COMPLETED_DATE'; date: string }
  | { type: 'SET_COMPLETED_YEAR'; year: string }
  | { type: 'SET_COMPLETED_YEAR_ERROR'; error: string }
  | { type: 'SET_START_DATE'; date: string }
  // today 를 액션에 실어 보내 reducer 를 순수하게 유지한다(안에서 new Date() 를 부르지 않는다)
  | { type: 'TOGGLE_START_DATE'; checked: boolean; today: string }
  | { type: 'SET_RATING'; rating: BookRating | 'life' }
  | { type: 'SET_ONE_LINE_REVIEW'; value: string }
  | { type: 'SET_PERSONAL_MEMO'; value: string }
  | { type: 'SET_TAGS_INPUT'; value: string }
  | { type: 'SET_TAG_ERROR'; error: string }
  | { type: 'SET_IS_PUBLIC'; isPublic: boolean };

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_STATUS':
      return {
        ...state,
        status: action.status,
        // 상태 변경 시 시작일 관련 필드 동시 초기화
        // → useState 3번 호출 없이 한 번의 dispatch로 처리
        showStartDate: false,
        startDate: '',
      };
    case 'SET_COMPLETED_PRECISION':
      // 다른 칸의 값은 지우지 않는다 — 눌러 보고 돌아왔을 때 입력이 남아 있어야 한다.
      // 무엇을 저장할지는 제출할 때 정밀도 하나로 정한다(toCompletedFields)
      return {
        ...state,
        completedPrecision: action.precision,
        completedYearError: '',
      };
    case 'SET_COMPLETED_DATE':
      return { ...state, completedDate: action.date };
    case 'SET_COMPLETED_YEAR':
      return { ...state, completedYear: action.year, completedYearError: '' };
    case 'SET_COMPLETED_YEAR_ERROR':
      return { ...state, completedYearError: action.error };
    case 'SET_START_DATE':
      return { ...state, startDate: action.date };
    case 'TOGGLE_START_DATE':
      // 켜는 순간 비어 있으면 오늘로 채운다 — 대부분 '오늘부터 읽기 시작'이라 날짜를 다시 고를 일이 없다.
      // 이미 고른 날짜(수정 화면·껐다 켬)는 덮어쓰지 않는다
      return {
        ...state,
        showStartDate: action.checked,
        startDate:
          action.checked && !state.startDate ? action.today : state.startDate,
      };
    case 'SET_RATING':
      // 인생책 선택 = 최고점 + 플래그. 배타 선택이므로 다른 점수를 고르면 플래그가 풀린다
      return action.rating === 'life'
        ? { ...state, rating: 5, isLifeBook: true }
        : { ...state, rating: action.rating, isLifeBook: false };
    case 'SET_ONE_LINE_REVIEW':
      return { ...state, oneLineReview: action.value };
    case 'SET_PERSONAL_MEMO':
      return { ...state, personalMemo: action.value };
    case 'SET_TAGS_INPUT':
      // 태그 입력 시 에러 자동 초기화
      return { ...state, tagsInput: action.value, tagError: '' };
    case 'SET_TAG_ERROR':
      return { ...state, tagError: action.error };
    case 'SET_IS_PUBLIC':
      return { ...state, isPublic: action.isPublic };
    default:
      return state;
  }
}

const COMPLETED_PRECISION_OPTIONS: {
  value: CompletedPrecision;
  label: string;
}[] = [
  { value: 'date', label: '날짜' },
  { value: 'year', label: '연도만' },
  { value: 'unknown', label: '잘 모르겠어요' },
];

const COMPLETED_PRECISION_HINT: Record<CompletedPrecision, string> = {
  date: '비워 두면 오늘로 기록해요.',
  year: '그해 서재와 통계에 들어가요.',
  unknown: '연도별 서재에는 보이지 않고, 전체 서재와 통계에만 들어가요.',
};

// 라벨 앞 아이콘 — 글자보다 한 톤 옅게 두어 라벨 글자가 먼저 읽히게 한다
const ICON_CLASS = 'h-4 w-4 shrink-0 text-muted-foreground';

const RequiredBadge = () => (
  <span className='rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium leading-none text-primary'>
    필수
  </span>
);

/**
 * 수정 화면에서 열었을 때의 정밀도.
 *
 * 완독으로 저장된 책인데 날짜도 연도도 없으면 '모름'이다. 완독이 아닌 책을 열어
 * 완독으로 바꾸는 경우에는 날짜가 없는 게 당연하므로 기본값(날짜)으로 둔다 —
 * 그렇지 않으면 읽는 중이던 책을 완독 처리할 때 '모름'이 미리 골라져 있다.
 */
export const toInitialCompletedPrecision = (
  initialData?: Partial<BookFormData>
): CompletedPrecision => {
  if (initialData?.completed_date) return 'date';
  if (initialData?.completed_year) return 'year';
  if (initialData?.status === 'completed') return 'unknown';
  return 'date';
};

/**
 * 정밀도에 맞춰 저장할 두 컬럼을 만든다. 고르지 않은 쪽은 null 로 보내야
 * 수정에서 '날짜 → 모름'으로 바꿨을 때 옛 날짜가 남지 않는다(DB CHECK 도 둘 다 찬 값을 막는다).
 *
 * @returns 연도가 올바르지 않으면 null
 */
export const toCompletedFields = (
  state: Pick<
    FormState,
    'completedPrecision' | 'completedDate' | 'completedYear'
  >,
  today: string
): { completed_date: string | null; completed_year: number | null } | null => {
  switch (state.completedPrecision) {
    case 'date':
      // 완독일은 선택 항목이라 required 를 걸지 않는다.
      // 기본값이 이미 오늘이므로 이 폴백은 사용자가 의도적으로 비운 경우에만 동작한다.
      return {
        completed_date: state.completedDate || today,
        completed_year: null,
      };
    case 'year': {
      const year = Number(state.completedYear);
      const currentYear = Number(today.slice(0, 4));
      if (!isValidCompletedYear(year, currentYear)) return null;
      return { completed_date: null, completed_year: year };
    }
    case 'unknown':
      return { completed_date: null, completed_year: null };
  }
};

/**
 * 도서 등록 폼 컴포넌트
 *
 * 학습 포인트:
 * - useReducer로 복잡한 폼 상태 관리
 * - SET_STATUS 액션이 연쇄 초기화를 한 번에 처리 (원자적 상태 전환)
 * - 상태별 조건부 필드 표시 (UX 개선)
 *
 * UX 개선 (완독 기록을 한 문장 중심으로):
 * - 필수는 독서 상태 하나다. 나머지는 구분선 아래 '선택'으로 모으고 접지 않는다
 *   (예전 '더 남기기' 접힘은 완독일·메모를 찾으려면 한 번 더 눌러야 했다).
 * - 선택 항목 중 한줄평과 평가 점수를 맨 위에 두어 바로 손이 가게 한다.
 * - 완독일은 [날짜 ▾] 선택과 입력칸을 한 줄에 둔다. 비우면 오늘로 채워진다.
 * - 공개 설정은 저장 버튼 바로 위에 둔다: 기본값이 공개(true)라 방금 쓴 문장이
 *   공개 서재에 게시된다. 편리한 기본값과 주의가 필요 없는 결정은 다르다.
 */
export const BookRegistrationForm = ({
  book,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  initialStatus = 'completed',
  onReselectBook,
}: BookRegistrationFormProps) => {
  const formId = useId();
  const ids = {
    status: `${formId}-status`,
    completedWhen: `${formId}-completed-when`,
    completedDate: `${formId}-completed-date`,
    completedYear: `${formId}-completed-year`,
    completedYearError: `${formId}-completed-year-error`,
    rating: `${formId}-rating`,
    showStartDate: `${formId}-show-start-date`,
    oneLineReview: `${formId}-one-line-review`,
    personalMemo: `${formId}-personal-memo`,
    tags: `${formId}-tags`,
    isPublic: `${formId}-is-public`,
  };

  const [state, dispatch] = useReducer(formReducer, {
    status: initialData?.status || initialStatus,
    completedPrecision: toInitialCompletedPrecision(initialData),
    completedDate: initialData?.completed_date || toKstDateKey(new Date()),
    completedYear: initialData?.completed_year
      ? String(initialData.completed_year)
      : '',
    completedYearError: '',
    startDate: initialData?.start_date || '',
    showStartDate: !!initialData?.start_date,
    rating: initialData?.rating,
    // 수정 화면에서 인생책으로 저장된 책을 열었을 때 선택이 풀려 보이면 안 된다
    isLifeBook: initialData?.is_life_book ?? false,
    oneLineReview: initialData?.one_line_review || '',
    personalMemo: initialData?.personal_memo || '',
    tagsInput: initialData?.tags ? initialData.tags.join(', ') : '',
    tagError: '',
    isPublic:
      initialData?.is_public !== undefined ? initialData.is_public : true,
  });

  // 완독 직후엔 손이 바로 문장으로 가야 한다 — 저장소 관례대로 autoFocus 속성 대신 ref 로 준다.
  // 수정 화면(initialData)에서는 포커스를 옮기지 않는다: 사용자는 다른 필드를 고치러 왔을 수 있다.
  const oneLineReviewRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (initialData) return;
    // preventScroll: 그냥 focus() 하면 입력란이 뷰로 스크롤되고 모바일에서는 키보드가
    // 바로 올라와, 위쪽 표지·제목·저자 미리보기가 화면 밖으로 밀린다. 추가 흐름에서
    // 그 미리보기는 "책을 제대로 골랐나" 를 확인할 유일한 수단이다.
    oneLineReviewRef.current?.focus({ preventScroll: true });
  }, [initialData]);

  const {
    status,
    completedPrecision,
    completedDate,
    completedYear,
    completedYearError,
    startDate,
    showStartDate,
    rating,
    isLifeBook,
    oneLineReview,
    personalMemo,
    tagsInput,
    tagError,
    isPublic,
  } = state;

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    dispatch({ type: 'SET_TAG_ERROR', error: '' });

    const formData: BookFormData = {
      status,
      rating,
      is_life_book: isLifeBook,
      one_line_review: oneLineReview || undefined,
      // 빈 문자열도 그대로 보낸다 — 서버(트리거)가 '' 를 "메모 지우기"로 처리한다.
      // undefined 로 빼면 수정 화면에서 메모를 비워도 예전 메모가 남는다.
      personal_memo: personalMemo,
      is_public: isPublic,
    };

    if (status === 'completed') {
      const today = toKstDateKey(new Date());
      const completedFields = toCompletedFields(
        { completedPrecision, completedDate, completedYear },
        today
      );
      if (!completedFields) {
        dispatch({
          type: 'SET_COMPLETED_YEAR_ERROR',
          error: `${MIN_COMPLETED_YEAR}년부터 ${today.slice(0, 4)}년 사이로 적어 주세요.`,
        });
        return;
      }
      Object.assign(formData, completedFields);
    }

    // 시작일 추가 (완독 or 읽는중)
    if (
      (status === 'completed' || status === 'reading') &&
      showStartDate &&
      startDate
    ) {
      formData.start_date = startDate;
    }

    // 태그 처리: 쉼표로 구분, 중복 제거, 10개 제한
    if (tagsInput.trim()) {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      // 중복 제거 (Set 사용)
      const uniqueTags = Array.from(new Set(tags));

      // 10개 초과 검증
      if (uniqueTags.length > 10) {
        dispatch({
          type: 'SET_TAG_ERROR',
          error: '태그는 최대 10개까지 입력할 수 있습니다.',
        });
        return;
      }

      formData.tags = uniqueTags;
    }

    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? '도서 수정' : '도서 등록'}</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* 책 정보 미리보기 */}
          <div className='flex items-start justify-between gap-4 rounded-lg bg-muted/50 p-4'>
            <div className='flex gap-4'>
              <div className='relative h-32 w-24 shrink-0'>
                <BookCover
                  src={book.coverImage}
                  title={book.title}
                  size='fill'
                />
              </div>
              <div>
                <h4 className='font-medium'>{book.title}</h4>
                {book.subTitle && (
                  <p className='text-xs text-muted-foreground'>
                    {book.subTitle}
                  </p>
                )}
                <p className='text-sm text-foreground'>{book.author}</p>
                <p className='text-sm text-muted-foreground'>
                  {book.publisher}
                </p>
                {/* 좌변을 boolean 으로 좁힌다 — 쪽수가 0이면 화면에 "0"이 찍힌다 */}
                {book.page !== null && book.page > 0 && (
                  <p className='text-sm text-muted-foreground'>{book.page}쪽</p>
                )}
              </div>
            </div>
            {onReselectBook && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={onReselectBook}
                className='shrink-0 shadow-none'
              >
                <RefreshCw className='h-3.5 w-3.5' />책 변경
              </Button>
            )}
          </div>

          {/* ── 필수 ── 저장에 꼭 필요한 건 독서 상태 하나뿐이다 */}
          <div className='space-y-2'>
            {/* 같은 폼의 Label·Input·Switch 와 같은 자리에서 나온 컨트롤이라
                디자인 시스템 Select 를 쓴다. 네이티브 <select> 였을 때는 높이·테두리를
                손으로 맞췄고 focus-visible 링이 없었다.

                htmlFor 가 그대로 동작한다 — SelectTrigger 는 <button> 이고
                button 은 labelable 요소다(라벨을 눌러도 포커스가 간다).

                required 는 뺐다. status 는 reducer 초기값이 있어 빈 값이 될 수 없으므로
                브라우저 검증이 발동할 일이 없고, Radix 에서는 hidden input 을 통해
                다르게 동작한다. */}
            <Label htmlFor={ids.status}>
              <BookOpen className={ICON_CLASS} aria-hidden />
              독서 상태
              <RequiredBadge />
            </Label>
            <Select
              value={status}
              onValueChange={(value) =>
                dispatch({
                  type: 'SET_STATUS',
                  status: value as BookStatus,
                })
              }
            >
              <SelectTrigger id={ids.status} className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='completed'>완독</SelectItem>
                <SelectItem value='reading'>읽는 중</SelectItem>
                <SelectItem value='want_to_read'>읽고 싶은 책</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── 선택 ── 접지 않고 다 보여 준다. 대신 "비워 둬도 된다"를 구분선에서 한 번 말한다.
              예전 '더 남기기' 접힘은 완독일·메모를 찾으려면 한 번 더 눌러야 했다 */}
          <div className='flex items-center gap-3'>
            <span className='h-px flex-1 bg-border' />
            <span className='text-xs text-muted-foreground'>
              여기부터는 선택 · 비워 둬도 저장돼요
            </span>
            <span className='h-px flex-1 bg-border' />
          </div>

          {/* 이 책을 한 문장으로 — 완독 기록의 핵심이라 선택 항목 중 가장 위에 둔다 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label htmlFor={ids.oneLineReview}>
                <Quote className={ICON_CLASS} aria-hidden />이 책을 한 문장으로
                남긴다면?
              </Label>
              <Input
                id={ids.oneLineReview}
                ref={oneLineReviewRef}
                type='text'
                value={oneLineReview}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_ONE_LINE_REVIEW',
                    value: e.target.value,
                  })
                }
                placeholder='덮고 나서 남은 생각을 그대로 적어도 좋아요'
                maxLength={100}
              />
            </div>
          )}

          {/* 평가 점수 - 완독일 때만 표시 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label id={ids.rating}>
                <Star className={ICON_CLASS} aria-hidden />
                평가 점수
              </Label>
              <RatingPicker
                rating={rating}
                isLifeBook={isLifeBook}
                labelledBy={ids.rating}
                onChange={(score) =>
                  dispatch({ type: 'SET_RATING', rating: score })
                }
              />
              {/* 인생책은 오래전에 읽은 경우가 많다. 그대로 저장하면 오늘 날짜로 들어간다 —
                  바로 아래 완독일에서 고칠 수 있다는 걸 여기서 알린다 */}
              {isLifeBook && completedPrecision === 'date' && !initialData && (
                <p className='text-sm text-muted-foreground'>
                  언제 읽었는지 기억나지 않으면 아래 완독일에서
                  &apos;연도만&apos;이나 &apos;잘 모르겠어요&apos;를 고를 수
                  있어요.
                </p>
              )}
            </div>
          )}

          {/* 완독일 - 완독 상태일 때만 표시.
              인생책처럼 오래전에 읽은 책은 날짜를 모른다 → 연도만, 또는 모름.
              [날짜 ▾] 선택과 입력칸을 한 줄에 둔다 — 고르는 것과 적는 것이 한 동작으로 읽힌다 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label id={ids.completedWhen}>
                <CalendarCheck className={ICON_CLASS} aria-hidden />
                완독일
              </Label>
              <div className='flex items-center gap-2'>
                {/* 버튼 3개(날짜·연도만·잘 모르겠어요)는 390px 에서 입력칸과 한 줄에 못 들어가
                    두 줄로 밀렸다. 고르는 칸을 작은 Select 로 줄여 입력칸 자리를 남긴다 */}
                <Select
                  value={completedPrecision}
                  onValueChange={(value) =>
                    dispatch({
                      type: 'SET_COMPLETED_PRECISION',
                      precision: value as CompletedPrecision,
                    })
                  }
                >
                  <SelectTrigger
                    aria-label='완독일 기록 방식'
                    className='w-auto shrink-0'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLETED_PRECISION_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {completedPrecision === 'date' && (
                  <Input
                    id={ids.completedDate}
                    type='date'
                    aria-label='완독 날짜'
                    value={completedDate}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_COMPLETED_DATE',
                        date: e.target.value,
                      })
                    }
                    className='w-auto min-w-0 flex-1'
                  />
                )}

                {completedPrecision === 'year' && (
                  <Input
                    id={ids.completedYear}
                    type='number'
                    inputMode='numeric'
                    aria-label='완독 연도'
                    aria-invalid={!!completedYearError}
                    aria-describedby={
                      completedYearError ? ids.completedYearError : undefined
                    }
                    min={MIN_COMPLETED_YEAR}
                    placeholder='예: 2015'
                    value={completedYear}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_COMPLETED_YEAR',
                        year: e.target.value,
                      })
                    }
                    className='w-auto min-w-0 flex-1'
                  />
                )}
              </div>

              {completedYearError && completedPrecision === 'year' ? (
                <p
                  id={ids.completedYearError}
                  className='text-sm text-destructive'
                >
                  {completedYearError}
                </p>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  {COMPLETED_PRECISION_HINT[completedPrecision]}
                </p>
              )}
            </div>
          )}

          {/* 시작일 - 완독 or 읽는중일 때만 표시.
              라벨·스위치·날짜를 한 줄에 둔다. 체크박스였을 때는 다른 칸과 모양이 달라 튀었다 */}
          {(status === 'completed' || status === 'reading') && (
            <div className='flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2'>
              <Label htmlFor={ids.showStartDate} className='cursor-pointer'>
                <CalendarPlus className={ICON_CLASS} aria-hidden />
                시작일
              </Label>
              <Switch
                id={ids.showStartDate}
                checked={showStartDate}
                onCheckedChange={(checked) =>
                  dispatch({
                    type: 'TOGGLE_START_DATE',
                    checked,
                    today: toKstDateKey(new Date()),
                  })
                }
              />
              {showStartDate && (
                <Input
                  type='date'
                  aria-label='시작 날짜'
                  value={startDate}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_START_DATE',
                      date: e.target.value,
                    })
                  }
                  className='w-auto min-w-[9rem] flex-1'
                />
              )}
            </div>
          )}

          {/* 나만의 메모 */}
          <div className='space-y-2'>
            {/* '나만 보기'는 라벨 밖에 둔다 — 안에 넣으면 입력칸 이름이 "나만의 메모 나만 보기"가 된다 */}
            <div className='flex items-center gap-2'>
              <Label htmlFor={ids.personalMemo}>
                <NotebookPen className={ICON_CLASS} aria-hidden />
                나만의 메모
              </Label>
              <span
                id={`${ids.personalMemo}-hint`}
                className='inline-flex items-center gap-1 text-xs text-muted-foreground'
              >
                <Lock className='h-3 w-3' aria-hidden />
                나만 보기
              </span>
            </div>
            <Textarea
              id={ids.personalMemo}
              value={personalMemo}
              onChange={(e) =>
                dispatch({
                  type: 'SET_PERSONAL_MEMO',
                  value: e.target.value,
                })
              }
              placeholder='책을 공개해도 메모는 나에게만 보여요'
              rows={3}
              maxLength={10000}
              aria-describedby={`${ids.personalMemo}-hint`}
            />
          </div>

          {/* 태그 */}
          <div className='space-y-2'>
            <Label htmlFor={ids.tags}>
              <Tag className={ICON_CLASS} aria-hidden />
              태그
            </Label>
            <Input
              id={ids.tags}
              type='text'
              value={tagsInput}
              onChange={(e) =>
                dispatch({ type: 'SET_TAGS_INPUT', value: e.target.value })
              }
              placeholder='예: 자기계발, 경영, 추천도서'
              className={tagError ? 'border-destructive' : ''}
            />
            {tagError ? (
              <p className='text-sm text-destructive'>{tagError}</p>
            ) : (
              <p className='text-xs text-muted-foreground'>
                쉼표(,)로 나눠 최대 10개까지 적을 수 있어요.
              </p>
            )}
          </div>

          {/* 공개 설정 — isPublic 기본값이 true 라 저장 버튼 바로 위, 눈에 띄는 카드로 둔다.
              사적인 생각을 적은 사용자가 '공개'라는 단어를 못 본 채 공개 서재에 게시하면 안 된다 */}
          <div className='flex items-center justify-between gap-4 rounded-lg border p-4'>
            <div className='space-y-1'>
              <Label htmlFor={ids.isPublic}>
                {isPublic ? (
                  <Globe className={ICON_CLASS} aria-hidden />
                ) : (
                  <Lock className={ICON_CLASS} aria-hidden />
                )}
                공개 설정
              </Label>
              <p className='text-sm text-muted-foreground'>
                {isPublic
                  ? '다른 사람들이 이 책을 볼 수 있습니다.'
                  : '나만 볼 수 있습니다. (비공개)'}
              </p>
              <p className='text-xs text-muted-foreground'>
                나중에 서재에서 보관으로 옮길 수 있어요.
              </p>
            </div>
            <Switch
              id={ids.isPublic}
              checked={isPublic}
              onCheckedChange={(checked) =>
                dispatch({ type: 'SET_IS_PUBLIC', isPublic: checked })
              }
            />
          </div>

          {/* 버튼 */}
          <div className='flex gap-3'>
            <Button type='submit' disabled={isLoading} className='flex-1'>
              {isLoading
                ? initialData
                  ? '수정 중...'
                  : '등록 중...'
                : initialData
                  ? '수정하기'
                  : '등록하기'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={onCancel}
              disabled={isLoading}
              className='flex-1'
            >
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

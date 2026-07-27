'use client';

import { useEffect, useId, useReducer, useRef } from 'react';

import Image from 'next/image';

import { RefreshCw } from 'lucide-react';

import { upgradeImageResolution } from '@/shared/lib/imageUtils';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';

import { isLifeBook } from '@/entities/book';

import type { AladinBook, BookRating, BookStatus } from '@/entities/book';

type BookRegistrationFormProps = {
  book: AladinBook;
  onSubmit: (formData: BookFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<BookFormData>;
  // 수정 모드에서만 전달 — 있을 때만 "책 선택부터 다시" 버튼을 보여준다
  onReselectBook?: () => void;
};

export type BookFormData = {
  status: BookStatus;
  completed_date?: string;
  start_date?: string;
  rating?: BookRating;
  one_line_review?: string;
  personal_memo?: string;
  tags?: string[];
  is_public?: boolean;
};

// ─── State 타입 정의 ───────────────────────────────────────────────
// 폼의 모든 입력 상태를 하나의 객체로 관리
type FormState = {
  status: BookStatus;
  completedDate: string;
  startDate: string;
  showStartDate: boolean;
  rating: BookRating | undefined;
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
  | { type: 'SET_COMPLETED_DATE'; date: string }
  | { type: 'SET_START_DATE'; date: string }
  | { type: 'TOGGLE_START_DATE'; checked: boolean }
  | { type: 'SET_RATING'; rating: BookRating | undefined }
  | { type: 'SET_ONE_LINE_REVIEW'; value: string }
  | { type: 'SET_PERSONAL_MEMO'; value: string }
  | { type: 'SET_TAGS_INPUT'; value: string }
  | { type: 'SET_TAG_ERROR'; error: string }
  | { type: 'SET_IS_PUBLIC'; isPublic: boolean };

function formReducer(state: FormState, action: FormAction): FormState {
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
    case 'SET_COMPLETED_DATE':
      return { ...state, completedDate: action.date };
    case 'SET_START_DATE':
      return { ...state, startDate: action.date };
    case 'TOGGLE_START_DATE':
      return { ...state, showStartDate: action.checked };
    case 'SET_RATING':
      return { ...state, rating: action.rating };
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

/**
 * 도서 등록 폼 컴포넌트
 *
 * 학습 포인트:
 * - useReducer로 복잡한 폼 상태 관리
 * - SET_STATUS 액션이 연쇄 초기화를 한 번에 처리 (원자적 상태 전환)
 * - 상태별 조건부 필드 표시 (UX 개선)
 *
 * UX 개선 (완독 기록을 한 문장 중심으로):
 * - 완독일 때 한줄평과 평가 점수를 맨 위에 두어 바로 손이 가게 한다.
 * - 완독일·시작일·메모·태그는 '더 남기기'로 접는다 (기본값이 이미 옳아
 *   필수 입력이 아니다). 완독일을 비우면 제출 시 오늘로 채워진다.
 * - 공개 설정은 접지 않는다: 기본값이 공개(true)라 방금 쓴 문장이 공개 서재에
 *   게시되는데, 접어 두면 사용자가 '공개'라는 단어를 한 번도 못 보고 저장한다.
 *   편리한 기본값과 주의가 필요 없는 결정은 다르다.
 */
export const BookRegistrationForm = ({
  book,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  onReselectBook,
}: BookRegistrationFormProps) => {
  // 고해상도 이미지 URL로 변환
  const highResCover = book.cover
    ? upgradeImageResolution(book.cover)
    : book.cover;

  const formId = useId();
  const ids = {
    status: `${formId}-status`,
    completedDate: `${formId}-completed-date`,
    rating: `${formId}-rating`,
    showStartDate: `${formId}-show-start-date`,
    oneLineReview: `${formId}-one-line-review`,
    personalMemo: `${formId}-personal-memo`,
    tags: `${formId}-tags`,
    isPublic: `${formId}-is-public`,
  };

  const [state, dispatch] = useReducer(formReducer, {
    status: initialData?.status || 'completed',
    completedDate:
      initialData?.completed_date || new Date().toISOString().split('T')[0],
    startDate: initialData?.start_date || '',
    showStartDate: !!initialData?.start_date,
    rating: initialData?.rating,
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
    completedDate,
    startDate,
    showStartDate,
    rating,
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
      one_line_review: oneLineReview || undefined,
      personal_memo: personalMemo || undefined,
      is_public: isPublic,
    };

    // 완독일은 '더 남기기' 안에 접혀 있어 required 를 걸 수 없다.
    // 접힌 details 안의 빈 required 는 브라우저가 "not focusable" 로 제출을
    // 조용히 막는다 — 화면엔 아무 에러도 안 뜬다.
    // 기본값이 이미 오늘이므로 이 폴백은 사용자가 의도적으로 비운 경우에만 동작한다.
    if (status === 'completed') {
      formData.completed_date =
        completedDate || new Date().toISOString().split('T')[0];
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
                {highResCover ? (
                  <Image
                    src={highResCover}
                    alt={book.title}
                    fill
                    className='object-cover'
                    sizes='96px'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center bg-sunken text-sm text-text-faint'>
                    표지 없음
                  </div>
                )}
              </div>
              <div>
                <h4 className='font-semibold'>{book.title}</h4>
                <p className='text-sm text-foreground'>{book.author}</p>
                <p className='text-sm text-muted-foreground'>
                  {book.publisher}
                </p>
                {book.subInfo?.itemPage && (
                  <p className='text-sm text-muted-foreground'>
                    {book.subInfo.itemPage}쪽
                  </p>
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

          {/* 독서 상태 */}
          <div className='space-y-2'>
            <Label htmlFor={ids.status}>독서 상태 *</Label>
            <select
              id={ids.status}
              value={status}
              onChange={(e) =>
                dispatch({
                  type: 'SET_STATUS',
                  status: e.target.value as BookStatus,
                })
              }
              className='w-full rounded-md border border-line p-2'
              required
            >
              <option value='completed'>완독</option>
              <option value='reading'>읽는 중</option>
              <option value='want_to_read'>읽고 싶은 책</option>
            </select>
          </div>

          {/* 이 책을 한 문장으로 — 완독 기록의 핵심이라 가장 위에 둔다 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label htmlFor={ids.oneLineReview}>
                이 책을 한 문장으로 남긴다면?
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
              <Label id={ids.rating}>평가 점수</Label>
              {/* role='group' + aria-labelledby: 흩어진 점수 버튼들을 "평가 점수" 그룹으로 묶어 읽히게 함 */}
              <div
                role='group'
                aria-labelledby={ids.rating}
                className='flex flex-wrap gap-2'
              >
                {[0, 1, 2, 3, 4, 5, 10].map((score) => {
                  // 10은 11번째 점수가 아니라 "인생책"이다.
                  // 버튼에 10을 그대로 쓰면 척도가 깨져 보이므로 이름으로 보여준다.
                  const label = isLifeBook(score) ? '인생책' : `${score}점`;

                  return (
                    <button
                      key={score}
                      type='button'
                      // aria-pressed: 어떤 점수가 선택됐는지 스크린 리더에 전달
                      aria-pressed={rating === score}
                      aria-label={label}
                      onClick={() =>
                        dispatch({
                          type: 'SET_RATING',
                          rating: score as BookRating,
                        })
                      }
                      className={`rounded-md border px-4 py-2 transition-colors ${
                        rating === score
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 선택 항목은 접어 둔다 — 완독 기록에 필요한 입력은 사실 0개다
              (상태·완독일 모두 기본값이 옳다). 공개 설정은 여기 넣지 않는다 */}
          <details
            open={!!initialData}
            className='rounded-lg border border-line p-4'
          >
            {/* summary 자체에 flex 를 주면 펼침 삼각형 마커가 사라진다. 안쪽 span 으로 정렬한다 */}
            <summary className='cursor-pointer text-sm font-semibold'>
              <span className='inline-flex items-center align-middle'>
                더 남기기
              </span>
            </summary>

            <div className='mt-4 space-y-6'>
              {/* 완독일 - 완독 상태일 때만 표시 */}
              {status === 'completed' && (
                <div className='space-y-2'>
                  <Label htmlFor={ids.completedDate}>완독일</Label>
                  <Input
                    id={ids.completedDate}
                    type='date'
                    value={completedDate}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_COMPLETED_DATE',
                        date: e.target.value,
                      })
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    비워 두면 오늘로 기록해요.
                  </p>
                </div>
              )}

              {/* 시작일 - 완독 or 읽는중일 때만 표시 */}
              {(status === 'completed' || status === 'reading') && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      id={ids.showStartDate}
                      checked={showStartDate}
                      onChange={(e) =>
                        dispatch({
                          type: 'TOGGLE_START_DATE',
                          checked: e.target.checked,
                        })
                      }
                      className='h-4 w-4'
                    />
                    <Label htmlFor={ids.showStartDate} className='cursor-pointer'>
                      시작일 추가 (옵션)
                    </Label>
                  </div>

                  {showStartDate && (
                    <Input
                      type='date'
                      value={startDate}
                      onChange={(e) =>
                        dispatch({ type: 'SET_START_DATE', date: e.target.value })
                      }
                      placeholder='시작일'
                    />
                  )}
                </div>
              )}

              {/* 나만의 메모 */}
              <div className='space-y-2'>
                <Label htmlFor={ids.personalMemo}>나만의 메모</Label>
                <Textarea
                  id={ids.personalMemo}
                  value={personalMemo}
                  onChange={(e) =>
                    dispatch({ type: 'SET_PERSONAL_MEMO', value: e.target.value })
                  }
                  placeholder='개인적인 생각이나 메모를 자유롭게 작성하세요'
                  rows={4}
                />
              </div>

              {/* 태그 */}
              <div className='space-y-2'>
                <Label htmlFor={ids.tags}>태그 (쉼표로 구분)</Label>
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
                  <p className='text-sm text-muted-foreground'>
                    쉼표(,)로 구분하여 최대 10개까지 입력할 수 있습니다. 중복된
                    태그는 자동으로 제거됩니다.
                  </p>
                )}
              </div>
            </div>
          </details>

          {/* 접기 밖에 둔다 — isPublic 기본값이 true 라, 접어 두면 처음 쓰는 사용자가
              사적인 생각을 적고 섹션을 한 번도 열지 않고 '공개'라는 단어를 못 본 채
              공개 서재에 게시한다. 스위치와 설명 문구는 저장 시점에 화면에 있어야 한다. */}
          {/* 공개/비공개 설정 */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <Label htmlFor={ids.isPublic} className='text-base'>
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

'use client';

import { useState } from 'react';

import Image from 'next/image';

import { upgradeImageResolution } from '@/shared/lib/imageUtils';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';

import type { AladinBook, BookRating, BookStatus } from '@/entities/book/types';

type BookRegistrationFormProps = {
  book: AladinBook;
  onSubmit: (formData: BookFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<BookFormData>;
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

/**
 * 도서 등록 폼 컴포넌트
 *
 * 학습 포인트:
 * - 복잡한 폼 상태 관리
 * - 상태별 조건부 필드 표시 (UX 개선)
 * - 배열 데이터 처리 (tags)
 *
 * UX 개선 (상태별 표시 필드):
 * - 완독: 완독일(필수) + 시작일(옵션) + 평점 + 한줄평 + 메모 + 태그 + 공개설정
 * - 읽는중: 시작일(옵션) + 메모 + 태그 + 공개설정
 * - 읽고싶은책: 메모 + 태그 + 공개설정만 표시
 */
export const BookRegistrationForm = ({
  book,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}: BookRegistrationFormProps) => {
  // 고해상도 이미지 URL로 변환
  const highResCover = book.cover
    ? upgradeImageResolution(book.cover)
    : book.cover;

  const [status, setStatus] = useState<BookStatus>(
    initialData?.status || 'completed'
  );
  const [completedDate, setCompletedDate] = useState(
    initialData?.completed_date || new Date().toISOString().split('T')[0]
  );
  const [startDate, setStartDate] = useState(initialData?.start_date || '');
  const [showStartDate, setShowStartDate] = useState(!!initialData?.start_date);
  const [rating, setRating] = useState<BookRating | undefined>(
    initialData?.rating
  );
  const [oneLineReview, setOneLineReview] = useState(
    initialData?.one_line_review || ''
  );
  const [personalMemo, setPersonalMemo] = useState(
    initialData?.personal_memo || ''
  );
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags ? initialData.tags.join(', ') : ''
  );
  const [tagError, setTagError] = useState('');
  const [isPublic, setIsPublic] = useState(
    initialData?.is_public !== undefined ? initialData.is_public : true
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTagError('');

    const formData: BookFormData = {
      status,
      rating,
      one_line_review: oneLineReview || undefined,
      personal_memo: personalMemo || undefined,
      is_public: isPublic,
    };

    // 완독: 완독일 필수
    if (status === 'completed') {
      formData.completed_date = completedDate;
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
        setTagError('태그는 최대 10개까지 입력할 수 있습니다.');
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
          <div className='flex gap-4 rounded-lg bg-gray-50 p-4'>
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
                <div className='flex h-full w-full items-center justify-center bg-gray-200 text-gray-400'>
                  No Image
                </div>
              )}
            </div>
            <div>
              <h4 className='font-semibold'>{book.title}</h4>
              <p className='text-sm text-gray-600'>{book.author}</p>
              <p className='text-sm text-gray-500'>{book.publisher}</p>
              {book.subInfo?.itemPage && (
                <p className='text-sm text-gray-500'>
                  📖 {book.subInfo.itemPage}쪽
                </p>
              )}
            </div>
          </div>

          {/* 독서 상태 */}
          <div className='space-y-2'>
            <Label htmlFor='status'>독서 상태 *</Label>
            <select
              id='status'
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as BookStatus);
                // 상태 변경 시 시작일 체크 초기화
                setShowStartDate(false);
                setStartDate('');
              }}
              className='w-full rounded-md border border-gray-300 p-2'
              required
            >
              <option value='completed'>완독</option>
              <option value='reading'>읽는 중</option>
              <option value='want_to_read'>읽고 싶은 책</option>
            </select>
          </div>

          {/* 완독일 - 완독 상태일 때만 표시 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label htmlFor='completed_date'>완독일 *</Label>
              <Input
                id='completed_date'
                type='date'
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* 시작일 - 완독 or 읽는중일 때만 표시 */}
          {(status === 'completed' || status === 'reading') && (
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='show_start_date'
                  checked={showStartDate}
                  onChange={(e) => setShowStartDate(e.target.checked)}
                  className='h-4 w-4'
                />
                <Label htmlFor='show_start_date' className='cursor-pointer'>
                  시작일 추가 (옵션)
                </Label>
              </div>

              {showStartDate && (
                <Input
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder='시작일'
                />
              )}
            </div>
          )}

          {/* 평가 점수 - 완독일 때만 표시 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label>평가 점수</Label>
              <div className='flex flex-wrap gap-2'>
                {[0, 1, 2, 3, 4, 5, 10].map((score) => (
                  <button
                    key={score}
                    type='button'
                    onClick={() => setRating(score as BookRating)}
                    className={`rounded-md border px-4 py-2 transition-colors ${
                      rating === score
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 한줄평 - 완독일 때만 표시 */}
          {status === 'completed' && (
            <div className='space-y-2'>
              <Label htmlFor='one_line_review'>한줄평</Label>
              <Input
                id='one_line_review'
                type='text'
                value={oneLineReview}
                onChange={(e) => setOneLineReview(e.target.value)}
                placeholder='이 책에 대한 한줄평을 남겨주세요'
                maxLength={100}
              />
            </div>
          )}

          {/* 나만의 메모 */}
          <div className='space-y-2'>
            <Label htmlFor='personal_memo'>나만의 메모</Label>
            <Textarea
              id='personal_memo'
              value={personalMemo}
              onChange={(e) => setPersonalMemo(e.target.value)}
              placeholder='개인적인 생각이나 메모를 자유롭게 작성하세요'
              rows={4}
            />
          </div>

          {/* 태그 */}
          <div className='space-y-2'>
            <Label htmlFor='tags'>태그 (쉼표로 구분)</Label>
            <Input
              id='tags'
              type='text'
              value={tagsInput}
              onChange={(e) => {
                setTagsInput(e.target.value);
                setTagError('');
              }}
              placeholder='예: 자기계발, 경영, 추천도서'
              className={tagError ? 'border-red-500' : ''}
            />
            {tagError ? (
              <p className='text-sm text-red-600'>{tagError}</p>
            ) : (
              <p className='text-sm text-gray-500'>
                쉼표(,)로 구분하여 최대 10개까지 입력할 수 있습니다. 중복된
                태그는 자동으로 제거됩니다.
              </p>
            )}
          </div>

          {/* 공개/비공개 설정 */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <Label htmlFor='is_public' className='text-base'>
                  공개 설정
                </Label>
                <p className='text-sm text-gray-500'>
                  {isPublic
                    ? '다른 사람들이 이 책을 볼 수 있습니다.'
                    : '나만 볼 수 있습니다. (비공개)'}
                </p>
              </div>
              <Switch
                id='is_public'
                checked={isPublic}
                onCheckedChange={setIsPublic}
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

'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Input, Label } from '@repo/ui';
import { ImagePlus, X } from 'lucide-react';

import { checkManualCoverFile } from '../lib/uploadManualCover';

/**
 * 검색되지 않는 책의 서지 정보 입력칸 — 도서 등록 폼의 "책 정보" 자리에 들어간다.
 *
 * 예전에는 이 입력칸이 별도 카드였고, 그 아래에 검색창·바코드가 그대로 떠 있었다.
 * 제목을 다 적고 "독서 기록 입력하기"를 누르면 그제야 등록 폼이 나오는 2단계였다.
 * 지금은 등록 폼(BookRegistrationForm)이 표지·제목 미리보기를 그리던 자리를 이
 * 입력칸으로 바꿔 끼우므로, 책 정보와 독서 기록을 한 화면에서 한 번에 저장한다.
 *
 * 값은 부모(도서 추가 페이지)가 들고 있다 — 저장 버튼은 등록 폼의 것이라, 저장할 때
 * 부모가 이 값을 검증(validateManualBook)하고 표지를 올린 뒤 책을 만든다.
 */

export type ManualBookDraft = {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  source_url: string;
  coverFile: File | null;
};

export const EMPTY_MANUAL_BOOK: ManualBookDraft = {
  title: '',
  author: '',
  publisher: '',
  isbn: '',
  source_url: '',
  coverFile: null,
};

type TextField = Exclude<keyof ManualBookDraft, 'coverFile'>;

export const ManualBookFields = ({
  value,
  onChange,
}: {
  value: ManualBookDraft;
  onChange: (next: ManualBookDraft) => void;
}) => {
  const id = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverError, setCoverError] = useState('');

  // 검색해도 없어서 넘어온 화면이라 손이 바로 제목으로 가야 한다
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  // 고른 사진 미리보기 주소. 고를 때 만들고, 바꾸거나 빼거나 화면을 떠날 때 풀어
  // 메모리를 돌려준다. 새로 그릴 일이 없도록 저장 중에도 File 은 부모가 들고 있다.
  // 앞뒤로 오가며 다시 그려질 때는 이미 고른 File 로 미리보기를 되살린다
  const [previewUrl, setPreviewUrl] = useState<string | null>(() =>
    value.coverFile ? URL.createObjectURL(value.coverFile) : null
  );
  const previewRef = useRef<string | null>(previewUrl);
  const replacePreview = (file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(previewRef.current);
  };
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const set = (key: TextField) => (e: { target: { value: string } }) =>
    onChange({ ...value, [key]: e.target.value });

  const field = (
    key: TextField,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      inputMode?: 'numeric';
      placeholder?: string;
    } = {}
  ) => (
    <div className='space-y-1.5'>
      <Label htmlFor={`${id}-${key}`}>
        {label}
        {!options.required && (
          <span className='text-xs font-normal text-text-subtle'>선택</span>
        )}
      </Label>
      <Input
        ref={key === 'title' ? titleRef : undefined}
        id={`${id}-${key}`}
        name={`manual-${key}`}
        value={value[key]}
        onChange={set(key)}
        required={options.required}
        type={options.type ?? 'text'}
        inputMode={options.inputMode}
        placeholder={options.placeholder}
        maxLength={key === 'source_url' ? 2000 : 200}
        autoComplete='off'
      />
    </div>
  );

  return (
    <section aria-label='책 정보' className='space-y-4'>
      <div className='flex gap-4'>
        {/* 표지 자리 — 등록 폼 미리보기와 같은 크기라, 사진을 고르면 그대로 표지가 된다 */}
        <div className='relative h-32 w-24 shrink-0'>
          {previewUrl ? (
            <>
              {/* blob 주소라 next/image 를 쓰지 않는다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt='고른 표지 사진'
                className='book-cover h-full w-full object-cover'
              />
              <button
                type='button'
                onClick={() => {
                  onChange({ ...value, coverFile: null });
                  replacePreview(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className='absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-card text-text-subtle shadow-sm hover:text-foreground'
                aria-label='표지 사진 빼기'
              >
                <X className='h-3.5 w-3.5' aria-hidden />
              </button>
            </>
          ) : (
            <label
              htmlFor={`${id}-cover`}
              className='flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line bg-muted/50 text-center text-xs text-text-subtle transition-colors hover:border-primary hover:text-primary focus-within:border-primary'
            >
              <ImagePlus className='h-5 w-5' aria-hidden />
              표지 사진
              <br />
              추가
            </label>
          )}
          <input
            ref={fileRef}
            id={`${id}-cover`}
            type='file'
            accept='image/jpeg,image/png,image/webp'
            className='sr-only'
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              const problem = file ? checkManualCoverFile(file) : null;
              setCoverError(problem ?? '');
              if (problem) {
                e.target.value = '';
                return;
              }
              onChange({ ...value, coverFile: file });
              replacePreview(file);
            }}
          />
        </div>

        <div className='min-w-0 flex-1 space-y-3'>
          {field('title', '책 제목', { required: true })}
          {field('author', '저자', { required: true })}
        </div>
      </div>

      {coverError && (
        <p role='alert' className='text-sm text-destructive'>
          {coverError}
        </p>
      )}

      <div className='grid gap-3 sm:grid-cols-2'>
        {field('publisher', '출판사')}
        {field('isbn', 'ISBN 13자리', {
          inputMode: 'numeric',
          placeholder: '책 뒷면 바코드 아래 숫자',
        })}
      </div>
      {field('source_url', '책을 확인할 수 있는 주소', {
        type: 'url',
        placeholder: 'https:// 출판사·서점 페이지',
      })}

      <p className='text-xs leading-relaxed text-text-subtle'>
        내 서재에는 바로 기록돼요. 운영자 확인 전에는 나에게만 보이고, 확인 후
        공개 설정에 따라 다른 사람에게도 보여요. 주소를 적어 주시면 확인이
        빨라져요.
      </p>
    </section>
  );
};

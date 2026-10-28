'use client';

import { useState } from 'react';

import { Button, Input, Label } from '@repo/ui';

import { validateManualBook } from '../model/review';

import type { ProviderBook } from '@/entities/book';

export const ManualBookForm = ({
  onSelect,
  onCancel,
}: {
  onSelect: (book: ProviderBook) => void;
  onCancel: () => void;
}) => {
  const [error, setError] = useState('');
  return (
    <form
      className='space-y-4 rounded-2xl border border-line p-5'
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
          const values = validateManualBook(Object.fromEntries(form));
          onSelect({
            isbn: values.isbn || `manual:${crypto.randomUUID()}`,
            title: values.title,
            author: values.author,
            publisher: values.publisher,
            subTitle: null,
            source: 'manual',
            sourceUrl: values.source_url,
            coverImage: '',
            spineImage: null,
            backImage: null,
            providerItemId: null,
            providerLink: '',
            pubDate: null,
            description: '',
            category: '',
            page: null,
            toc: null,
            dimensions: null,
          });
        } catch (err) {
          setError(
            err instanceof Error ? err.message : '입력을 확인해 주세요.'
          );
        }
      }}
    >
      <h2 className='text-base font-medium'>검색되지 않는 책 직접 등록</h2>
      <p className='text-sm text-text-subtle'>
        내 서재에는 바로 기록할 수 있어요. 검수 승인 전에는 나에게만 보이며,
        승인 후 공개 설정에 따라 다른 사람에게도 보여요. 표지는 기본 이미지로
        표시됩니다.
      </p>
      {[
        { name: 'title', label: '책 제목', required: true },
        { name: 'author', label: '저자', required: true },
        { name: 'publisher', label: '출판사 (선택)' },
        { name: 'isbn', label: 'ISBN 13자리 (선택)' },
        {
          name: 'source_url',
          label: '출판사·서점 등 확인할 수 있는 주소 (선택)',
        },
      ].map(({ name, label, required }) => (
        <div key={name} className='space-y-1'>
          <Label htmlFor={`manual-${name}`}>{label}</Label>
          <Input
            id={`manual-${name}`}
            name={name}
            required={required}
            maxLength={name === 'source_url' ? 2000 : 200}
            type={name === 'source_url' ? 'url' : 'text'}
          />
        </div>
      ))}
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <div className='flex justify-end gap-2'>
        <Button type='button' variant='ghost' onClick={onCancel}>
          취소
        </Button>
        <Button type='submit'>독서 기록 입력하기</Button>
      </div>
    </form>
  );
};

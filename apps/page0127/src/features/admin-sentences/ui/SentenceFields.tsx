'use client';

import { useEffect, useRef, useState } from 'react';

import { BookCover } from '@repo/ui';

import { SENTENCE_MAX_LENGTH } from '../model/sentenceForm';
import { BookPicker } from './BookPicker';

import type { AdminSentence } from '../api/getAdminSentences';
import type { PickedBook } from './BookPicker';

const inputClass =
  'w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm';

/**
 * 추가·수정 폼이 같이 쓰는 입력칸 — 수정이면 기존 값을 채운다.
 *
 * 폼 자체는 서버 컴포넌트의 server action 폼 그대로다. 이 칸들만 클라이언트라서,
 * 책 검색에서 고르면 제목·저자·옮긴이·ISBN·표지가 한 번에 채워진다(직접 고칠 수도 있다).
 * 표지는 직접 적는 칸을 두지 않는다 — 허용되지 않은 주소가 들어가면 사용자 카드가 깨지므로
 * 검색 결과에서만 받는다(서버에서도 호스트를 한 번 더 확인한다).
 */
const initialBook = (initial?: AdminSentence): PickedBook => ({
  book_title: initial?.book_title ?? '',
  author: initial?.author ?? '',
  translator: initial?.translator ?? '',
  isbn: initial?.isbn ?? '',
  cover_image: initial?.cover_image ?? '',
});

export const SentenceFields = ({ initial }: { initial?: AdminSentence }) => {
  const [book, setBook] = useState(() => initialBook(initial));
  const rootRef = useRef<HTMLDivElement>(null);

  // React 19 는 server action 이 끝나면 폼을 reset() 한다. 그런데 이 칸들은 state 로 쥐고 있어
  // 그대로 남는다 → "추가" 뒤 이전 책이 남아 다음 문장에 잘못 붙지 않게 reset 을 따라간다.
  useEffect(() => {
    const form = rootRef.current?.closest('form');
    if (!form) return;
    const handleReset = () => setBook(initialBook(initial));
    form.addEventListener('reset', handleReset);
    return () => form.removeEventListener('reset', handleReset);
  }, [initial]);

  const set =
    (key: keyof typeof book) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setBook((prev) => ({ ...prev, [key]: event.target.value }));

  const handlePick = (picked: PickedBook) => setBook(picked);

  return (
    <div ref={rootRef} className='grid gap-2 sm:grid-cols-2'>
      <div className='sm:col-span-2'>
        <BookPicker onPick={handlePick} />
      </div>

      <div className='flex items-start gap-3 sm:col-span-2'>
        <BookCover
          src={book.cover_image || null}
          title={book.book_title || '책'}
          size='xs'
          small
          decorative
        />
        <div className='min-w-0 text-xs text-text-subtle'>
          {book.cover_image
            ? '표지가 사용자 카드 왼쪽에 나와요.'
            : '표지 없음 — 책 검색에서 고르면 채워져요. 없으면 제목을 조판해요.'}
          {book.cover_image && (
            <button
              type='button'
              className='ml-2 underline'
              onClick={() => setBook((prev) => ({ ...prev, cover_image: '' }))}
            >
              표지 빼기
            </button>
          )}
        </div>
        <input type='hidden' name='cover_image' value={book.cover_image} />
      </div>

      <label className='sm:col-span-2'>
        <span className='text-xs text-text-subtle'>
          문장 (필수, {SENTENCE_MAX_LENGTH}자까지)
        </span>
        <textarea
          name='text'
          required
          maxLength={SENTENCE_MAX_LENGTH * 2}
          rows={3}
          defaultValue={initial?.text}
          className={inputClass}
        />
      </label>
      <label>
        <span className='text-xs text-text-subtle'>책 제목 (필수)</span>
        <input
          name='book_title'
          required
          value={book.book_title}
          onChange={set('book_title')}
          className={inputClass}
        />
      </label>
      <label>
        <span className='text-xs text-text-subtle'>저자</span>
        <input
          name='author'
          value={book.author}
          onChange={set('author')}
          className={inputClass}
        />
      </label>
      <label>
        <span className='text-xs text-text-subtle'>옮긴이</span>
        <input
          name='translator'
          value={book.translator}
          onChange={set('translator')}
          className={inputClass}
        />
      </label>
      <label>
        <span className='text-xs text-text-subtle'>쪽수</span>
        <input
          name='page'
          inputMode='numeric'
          defaultValue={initial?.page ?? ''}
          className={inputClass}
        />
      </label>
      <label>
        <span className='text-xs text-text-subtle'>
          ISBN (책 바로가기에 써요)
        </span>
        <input
          name='isbn'
          value={book.isbn}
          onChange={set('isbn')}
          className={inputClass}
        />
      </label>
      <label>
        <span className='text-xs text-text-subtle'>
          권리 메모 (허락·만료 근거, 사용자에게 안 보임)
        </span>
        <input
          name='rights_note'
          defaultValue={initial?.rights_note ?? ''}
          className={inputClass}
        />
      </label>
    </div>
  );
};

'use client';

import { useState } from 'react';

import { ChevronDown, Lock } from 'lucide-react';

import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';

import type { Book } from '@/entities/book';

type PrivateBooksDisclosureProps = {
  /** 비공개(is_public=false) 책 — 주인 화면에서만 넘어온다 */
  books: Book[];
  username: string;
};

/**
 * 책장 카드 맨 아래 "🔒 비공개 책 N권 펼치기".
 *
 * 예전에는 책장 밖에 '책장 / 보관' 버튼 두 개가 떠 있었는데, '보관'이 무엇인지 알 수 없었고
 * '책장' 버튼은 눌러도 바뀌는 게 없었다. 비공개 책은 책장의 일부이므로 책장 안으로 넣는다.
 */
export const PrivateBooksDisclosure = ({
  books,
  username,
}: PrivateBooksDisclosureProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (books.length === 0) return null;

  return (
    <div className='border-t border-line-soft pt-3'>
      <button
        type='button'
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className='flex items-center gap-1.5 text-sm text-text-body hover:text-text-strong'
      >
        <Lock className='size-3.5' aria-hidden />
        나만 보는 비공개 책 <strong>{books.length}권</strong>
        <ChevronDown
          className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
        <span className='ml-1 text-xs text-text-subtle'>
          방문자에게는 안 보여요
        </span>
      </button>

      {isOpen && (
        <PublicBookShelf
          books={books}
          username={username}
          bookHref={(book) => `/${username}/${book.id}`}
          compact
        />
      )}
    </div>
  );
};

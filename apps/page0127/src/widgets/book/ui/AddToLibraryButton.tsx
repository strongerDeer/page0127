'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { GlobalBook } from '@/entities/book/types';

type AddToLibraryButtonProps = {
  book: GlobalBook;
  isInLibrary: boolean;
  className?: string;
};

export const AddToLibraryButton = ({
  book,
  isInLibrary,
  className,
}: AddToLibraryButtonProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddToLibrary = async () => {
    if (loading || isInLibrary) return;
    setLoading(true);

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          cover_image: book.cover_image,
          spine_image: book.spine_image,
          description: book.description,
          pub_date: book.pub_date,
          category: book.category,
          status: 'want_to_read', // Default status
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('로그인이 필요합니다.');
          return;
        }
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add book');
      }

      router.refresh();
      toast.success('내 서재에 추가되었습니다.');
    } catch (error) {
      console.error(error);
      toast.error('책 담기 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (isInLibrary) {
    return (
      <Button variant='outline' className={`gap-2 ${className}`} disabled>
        <Check size={16} />
        이미 서재에 있음
      </Button>
    );
  }

  return (
    <Button
      className={`gap-2 ${className}`}
      onClick={handleAddToLibrary}
      disabled={loading}
    >
      <Plus size={16} />
      {loading ? '담는 중...' : '내 서재에 담기'}
    </Button>
  );
}

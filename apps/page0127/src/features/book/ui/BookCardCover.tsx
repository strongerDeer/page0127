import Image from 'next/image';
import Link from 'next/link';

import type { Book } from '@/entities/book';

type BookCardCoverProps = {
  book: Pick<Book, 'id' | 'title' | 'cover_image'>;
};

export const BookCardCover = ({ book }: BookCardCoverProps) => {
  return (
    <Link href={`/books/${book.id}`} className='relative h-48 w-36 flex-shrink-0'>
      {book.cover_image ? (
        <Image
          src={book.cover_image}
          alt={book.title}
          fill
          className='object-cover'
          sizes='144px'
        />
      ) : (
        <div className='flex h-full w-full items-center justify-center bg-muted text-muted-foreground'>
          No Image
        </div>
      )}
    </Link>
  );
};

import Image from 'next/image';
import Link from 'next/link';

import styles from './BookItem.module.scss';
import { Book } from '@models/Book';
export default function BookItem({ book }: { book: Book }) {
  return (
    <Link href={`/my/${book.id}`} key={book.id}>
      <div className={book.grade >= 5 ? styles.front : ''}>
        <Image
          src={book.grade >= 5 ? book.frontCover : book.flipCover}
          alt={book.title}
          width={100}
          height={100}
        />
      </div>
    </Link>
  );
}

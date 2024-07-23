'use client';
import BookList from '@components/book/BookList';
import useBooks from '@hooks/useBooks';

export default function Home() {
  const { data } = useBooks();

  return <main>{data && <BookList data={data} />}</main>;
}

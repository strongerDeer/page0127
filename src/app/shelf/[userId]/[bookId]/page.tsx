'use client';

import MyBookDetail from '@components/book/MyBookDetail';

import useMyBook from '@components/book/useMyBook';

export default function Page({
  params,
}: {
  params: { userId: string; bookId: string };
}) {
  const { userId, bookId } = params;

  const { data, isLoading } = useMyBook({ userId, bookId });

  if (!data || isLoading) {
    return <>Loading...</>;
  }

  return (
    <div>
      <MyBookDetail bookId={bookId} data={data} />
    </div>
  );
}

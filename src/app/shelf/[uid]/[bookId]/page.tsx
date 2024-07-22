'use client';

import MyBookDetail from '@components/book/MyBookDetail';

import useMyBook from '@components/book/useMyBook';

export default function Page({
  params,
}: {
  params: { uid: string; bookId: string };
}) {
  const { uid, bookId } = params;

  const { data, isLoading } = useMyBook({ uid, bookId });

  if (!data || isLoading) {
    return <>Loading...</>;
  }

  return (
    <div>
      <MyBookDetail data={data} />
    </div>
  );
}

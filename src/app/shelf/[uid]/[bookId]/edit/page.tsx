'use client';

import useMyBook from '@components/book/useMyBook';
import TemplateBookEdit from '@components/templates/TemplateBookEdit';

export default function Page({
  params,
}: {
  params: { uid: string; bookId: string };
}) {
  const { uid, bookId } = params;

  const { data } = useMyBook({ uid: uid, bookId: bookId });

  return (
    <div>
      {data && <TemplateBookEdit uid={uid} data={data} bookId={bookId} />}
    </div>
  );
}

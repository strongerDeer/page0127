'use client';

import useMyBook from '@components/book/useMyBook';
import TemplateBookEdit from '@components/templates/TemplateBookEdit';
import useUser from '@connect/user/useUser';

export default function Page({ params }: { params: { bookId: string } }) {
  const user = useUser();
  const { bookId } = params;

  const { data } = useMyBook({ uid: user?.uid as string, bookId: bookId });

  return (
    <div>
      {data && (
        <TemplateBookEdit
          uid={user?.uid as string}
          data={data}
          bookId={bookId}
        />
      )}
    </div>
  );
}

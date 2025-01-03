'use client';

import useMyBook from '@components/book/useMyBook';
import TemplateBookEdit from '@components/templates/TemplateBookEdit';
import useUser from '@connect/user/useUser';

export default function Page({ params }: { params: { bookId: string } }) {
  const user = useUser();
  const { bookId } = params;

  const { data } = useMyBook({
    userId: user?.userId as string,
    bookId: bookId,
  });

  return (
    <div>
      {data && (
        <TemplateBookEdit
          userId={user?.userId as string}
          data={data}
          bookId={bookId}
        />
      )}
    </div>
  );
}

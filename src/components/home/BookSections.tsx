import { Book } from '@connect/book';
import BookSection from './BookSection';

export default function BookSections({
  topLifeBooks,
  mostReadBooks,
}: {
  topLifeBooks: Book[];
  mostReadBooks: Book[];
}) {
  return (
    <>
      <BookSection
        title="독자들이 선택한 인생책"
        books={topLifeBooks}
        count={4}
      />
      <BookSection
        title="가장 많이 읽힌 도서"
        books={mostReadBooks}
        count={8}
      />
    </>
  );
}

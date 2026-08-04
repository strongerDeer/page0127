import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { Heart } from 'lucide-react';

import { PublicBookShelf } from './PublicBookShelf';

import type { Book } from '@/entities/book';

type LifeBooksShelfProps = {
  /** 전체 책 목록 — 이 안에서 인생책(is_life_book)만 골라낸다 */
  books: Book[];

  /** 섹션 제목 (소유자 "내 인생책" / 방문자 "OO님의 인생책") */
  title: string;

  /** 책 링크 계산용 username (없으면 /books/:id 로 떨어진다) */
  username?: string;
};

/**
 * '전체' 뷰의 인생책 섹션
 *
 * 인생책 = is_life_book 이 true 인 책 (전에는 rating=10 이라는 매직값이었다).
 * 별도 데이터 조회 없이 이미 내려온 books에서 골라내 표지 책장으로 보여준다.
 * (PublicBookShelf가 인생책을 이미 표지 뷰로 그리므로 그대로 재사용한다)
 *
 * 인생책이 하나도 없으면 빈 카드 대신 섹션을 통째로 숨긴다.
 */
export const LifeBooksShelf = ({
  books,
  title,
  username,
}: LifeBooksShelfProps) => {
  // books는 완독 최신순으로 정렬돼 내려오므로 인생책도 그대로 최신순이 된다
  const lifeBooks = books.filter((book) => book.is_life_book);

  if (lifeBooks.length === 0) return null;

  return (
    <Card className='rounded-2xl bg-card py-6 shadow-none'>
      <CardHeader className='pb-0'>
        <CardTitle className='flex items-center gap-2'>
          <Heart className='h-5 w-5 fill-chart-3 text-chart-3' />
          {title}
          <span className='text-sm font-normal text-muted-foreground'>
            {lifeBooks.length}권
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className='pb-0'>
        <PublicBookShelf books={lifeBooks} username={username} compact />
      </CardContent>
    </Card>
  );
};

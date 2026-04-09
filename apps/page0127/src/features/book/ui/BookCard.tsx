import { Card } from '@/shared/ui/card';

import { BookCardCover } from './BookCardCover';
import { BookCardInfo } from './BookCardInfo';

type BookCardProps = {
  children: React.ReactNode;
};

export const BookCard = ({ children }: BookCardProps) => {
  return <Card className='flex overflow-hidden'>{children}</Card>;
};

BookCard.Cover = BookCardCover;
BookCard.Info = BookCardInfo;

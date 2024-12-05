import { useQuery } from 'react-query';
import { getFilterBooks } from './books';
import { Book } from '.';

const BOOKS_PER_PAGE = 12;

type SortOption = '등록순' | '이름순' | '출시일순';

interface FilteredBooksResponse {
  items: Book[];
  total: number;
}

export default function useFilteredBook({
  like,
  page = 1,
  sortBy = '등록순',
}: {
  like: string[];
  page: number;
  sortBy: SortOption;
}) {
  return useQuery<FilteredBooksResponse>(
    ['filteredBooks', like, page, sortBy],
    async () => {
      const books = (await getFilterBooks(like)) as Book[];

      const sortedBooks = [...books].sort((a, b) => {
        switch (sortBy) {
          case '이름순':
            return a.title.localeCompare(b.title);
          case '출시일순':
            return (
              new Date(a.pubDate).getTime() - new Date(b.pubDate).getTime()
            );
          default: // '등록순'
            return (
              new Date(b.lastUpdatedTime).getTime() -
              new Date(a.lastUpdatedTime).getTime()
            );
        }
      });

      const startIndex = (page - 1) * BOOKS_PER_PAGE;
      const endIndex = startIndex + BOOKS_PER_PAGE;

      return {
        items: sortedBooks.slice(startIndex, endIndex),
        total: sortedBooks.length,
      };
    },
    {
      enabled: like?.length > 0,
    },
  );
}

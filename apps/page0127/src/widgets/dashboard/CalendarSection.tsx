import { createClient } from '@/shared/config/supabase/server';

import { CalendarBlock } from '@/widgets/dashboard/CalendarBlock';

import type { CalendarData } from '@/widgets/dashboard/ReadingCalendar';

/**
 * Calendar 영역 Server Component
 *
 * 학습 포인트:
 * - 자기 자신이 필요한 데이터를 직접 페치 → page.tsx의 직렬 await에서 분리
 * - <Suspense> 안에 두면 이 컴포넌트의 await만 끝나면 그 부분만 스트리밍됨
 * - 클라이언트 상호작용은 CalendarBlock(CC)에 위임
 */

type CalendarSectionProps = {
  userId: string;
};

export const CalendarSection = async ({ userId }: CalendarSectionProps) => {
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: calendarBooks } = await supabase
    .from('books')
    .select(
      'id, title, author, cover_image, rating, completed_date, page_count'
    )
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('completed_date', 'is', null)
    .gte('completed_date', startDate)
    .lte('completed_date', endDate)
    .order('completed_date', { ascending: true });

  // 날짜별 그룹핑
  const booksByDate = new Map<
    string,
    Array<{
      id: string;
      title: string;
      author: string;
      cover_image: string | null;
      rating: number | null;
    }>
  >();
  let totalPages = 0;

  calendarBooks?.forEach((book) => {
    const date = book.completed_date;
    if (!booksByDate.has(date)) booksByDate.set(date, []);
    booksByDate.get(date)!.push({
      id: book.id,
      title: book.title,
      author: book.author,
      cover_image: book.cover_image,
      rating: book.rating,
    });
    if (book.page_count) totalPages += book.page_count;
  });

  const initialData: CalendarData[] = Array.from(booksByDate.entries()).map(
    ([date, books]) => ({
      date,
      books: books as unknown as Array<{
        id: string;
        title: string;
        author: string;
        cover: string;
        rating: number;
      }>,
    })
  );

  const initialSummary = {
    totalBooks: calendarBooks?.length ?? 0,
    totalPages,
  };

  return (
    <CalendarBlock
      initialData={initialData}
      initialSummary={initialSummary}
      initialYear={year}
      initialMonth={month}
    />
  );
};

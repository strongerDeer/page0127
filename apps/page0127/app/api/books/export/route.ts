import { NextRequest, NextResponse } from 'next/server';

import { toKstDateKey } from '@/shared/lib/date';

import { buildBooksCsv } from '@/features/book-export/model/buildBooksCsv';
import { buildRecordsMarkdown } from '@/features/book-export/model/buildRecordsMarkdown';
import {
  exportFileHeaders,
  parseExportFormat,
} from '@/features/book-export/model/exportFile';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse } from '@/app/api/_helpers/response';

import type {
  ExportBook,
  ExportQuote,
} from '@/features/book-export/model/types';

export const dynamic = 'force-dynamic';

/** PostgREST 는 한 번에 최대 1,000줄을 준다 — 넘으면 range 로 나눠 받는다 */
const PAGE_SIZE = 1000;

const BOOK_COLUMNS =
  'isbn, title, author, publisher, status, read_count, start_date, completed_date, completed_year, rating, is_life_book, one_line_review, personal_memo, tags, is_public, created_at';

type PageResult = PromiseLike<{
  data: unknown[] | null;
  error: { message: string } | null;
}>;

/** 마지막 페이지(1,000줄 미만)가 나올 때까지 이어 받는다. 실패하면 null */
async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PageResult
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error('기록 내보내기 조회 실패:', error.message);
      return null;
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/**
 * GET /api/books/export?format=csv|md
 * 내 독서 기록(책·한줄평·메모·문장)을 파일로 내려준다.
 *
 * 학습 포인트:
 * - Route Handler 가 JSON 대신 **파일**을 응답한다. 본문은 그냥 글자이고, 브라우저가
 *   파일로 저장하게 만드는 건 `Content-Disposition: attachment` 헤더다 (exportFile.ts).
 *   그래서 화면에는 fetch·Blob 없이 `<a href download>` 링크 하나면 된다.
 * - 서버 액션이 아니라 Route Handler 인 이유: 서버 액션은 React 가 직렬화한 값을 돌려주는
 *   RPC 라 헤더를 정할 수 없다. 파일 다운로드는 일반 HTTP GET 이 맞다.
 * - 스트리밍(ReadableStream)은 쓰지 않는다. 한 사람 기록은 많아야 수천 줄(수백 KB)이라
 *   다 모아서 한 번에 보내도 충분하다. 수십만 줄이면 그때 스트림으로 바꾼다.
 * - 권한: 로그인 세션 클라이언트로 읽고, user_id 를 직접 거른다. RLS 가 한 번 더 막는다.
 *   비공개 책도 내 기록이라 그대로 담는다.
 */
export async function GET(request: NextRequest) {
  const format = parseExportFormat(request.nextUrl.searchParams.get('format'));
  if (!format) return errorResponse('format 은 csv 또는 md 여야 합니다.', 400);

  const { user, error: authError } = await getCurrentUser();
  if (authError) return authError;
  const userId = user!.id;

  const supabase = await getSupabaseClient();

  const books = await fetchAllPages<ExportBook>((from, to) =>
    supabase
      .from('books')
      .select(BOOK_COLUMNS)
      .eq('user_id', userId)
      // 같은 날 등록한 책끼리 순서가 페이지마다 흔들리지 않게 id 로 한 번 더 묶는다
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );

  // 문장은 Markdown 에만 들어간다 — CSV 는 한 줄 = 한 권이라 담을 칸이 없다
  const quotes =
    format === 'md'
      ? await fetchAllPages<ExportQuote>((from, to) =>
          supabase
            .from('book_quotes')
            .select('isbn, text, page, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to)
        )
      : [];

  if (!books || !quotes) return errorResponse('기록을 불러오지 못했습니다.');

  const exportedOn = toKstDateKey(new Date());
  const body =
    format === 'csv'
      ? buildBooksCsv(books)
      : buildRecordsMarkdown({ books, quotes, exportedOn });

  return new NextResponse(body, {
    headers: exportFileHeaders(format, exportedOn),
  });
}

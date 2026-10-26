import { NextRequest } from 'next/server';

import { getBookProvider } from '@/shared/api/book-provider';
import { quotePostgrestValue } from '@/shared/lib/postgrestFilter';

import { MATCH_BATCH_SIZE } from '@/features/book-import/model/limits';
import { mapWithLimit } from '@/features/book-import/model/mapWithLimit';
import { pickImportMatch } from '@/features/book-import/model/pickImportMatch';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

import type { ProviderBook } from '@/entities/book';
import type {
  MatchQuery,
  MatchResponse,
  MatchResult,
} from '@/features/book-import/model/types';

const CANDIDATES_PER_ROW = 5;
// YES24 10 RPS 한도 안쪽 — 요청이 겹쳐도 넘지 않게 여유를 둔다
const PROVIDER_CONCURRENCY = 4;

export const maxDuration = 60;

/**
 * POST /api/books/import/match
 * 일괄 등록할 줄들을 책으로 찾는다 (등록은 하지 않는다)
 *
 * 브라우저가 줄마다 /api/books/search 를 부르지 않고 여기로 묶어 보내는 이유:
 * 검색 라우트는 분당 20회 제한이라 50권만 넘어도 429 를 맞는다. 묶음 하나는 한 번으로 센다.
 *
 * ISBN 이 있으면 상세 조회로 그 책을, 없으면 제목으로 검색해 후보 5개를 준다.
 * 이미 서재에 있는 책은 따로 알려 준다 — 확인 화면에서 빼 두기 위해서다.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = (await request.json().catch(() => null)) as {
      rows?: unknown;
    } | null;
    const rows = parseQueries(body?.rows);
    if (!rows) return errorResponse('찾을 책 목록이 올바르지 않습니다.', 400);

    const provider = getBookProvider();
    const results = await mapWithLimit(
      rows,
      PROVIDER_CONCURRENCY,
      async (row): Promise<MatchResult> => {
        try {
          let candidates: ProviderBook[] = [];
          if (row.isbn) {
            const book = await provider.getByIsbn(row.isbn);
            if (book) candidates = [book];
          }
          // ISBN 으로 못 찾았으면(절판·오타) 제목으로 한 번 더 찾는다
          if (candidates.length === 0 && row.title) {
            const found = await provider.search(row.title, {
              maxResults: CANDIDATES_PER_ROW,
            });
            candidates = found.items;
          }
          return { candidates, picked: pickImportMatch(row, candidates) };
        } catch (error) {
          // 한 줄의 실패가 묶음 전체를 실패시키지 않는다 — 그 줄만 "못 찾음"이 된다
          console.warn('일괄 등록 매칭 실패:', error);
          return { candidates: [], picked: null };
        }
      }
    );

    const existing = await findExisting(
      user!.id,
      results.flatMap((r) => r.candidates)
    );

    return successResponse<MatchResponse>({ results, existing });
  } catch {
    return errorResponse('책을 찾는 중 오류가 발생했습니다.');
  }
}

const parseQueries = (value: unknown): MatchQuery[] | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.length > MATCH_BATCH_SIZE) return null;
  const rows: MatchQuery[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const { title, author, isbn } = item as Record<string, unknown>;
    if (typeof title !== 'string') return null;
    rows.push({
      title: title.slice(0, 200),
      author: typeof author === 'string' ? author.slice(0, 200) : null,
      isbn:
        typeof isbn === 'string' && /^97[89]\d{10}$/.test(isbn) ? isbn : null,
    });
  }
  return rows;
};

/**
 * 후보 중 이미 서재에 있는 책의 식별자.
 *
 * isbn 과 상품번호를 둘 다 본다 — `books.isbn` 에는 ISBN10·K코드가 섞여 있어
 * isbn 만으로는 예전에 담은 같은 책을 못 알아본다 (GET /api/books 의 중복 확인과 같은 이유).
 */
const findExisting = async (
  userId: string,
  candidates: ProviderBook[]
): Promise<MatchResponse['existing']> => {
  const isbns = [...new Set(candidates.map((b) => b.isbn))];
  const ids = [
    ...new Set(
      candidates.flatMap((b) => (b.providerItemId ? [b.providerItemId] : []))
    ),
  ];
  if (isbns.length === 0) return { isbns: [], providerItemIds: [] };

  const supabase = await getSupabaseClient();
  const filters = [
    `isbn.in.(${isbns.map(quotePostgrestValue).join(',')})`,
    ...(ids.length
      ? [`provider_item_id.in.(${ids.map(quotePostgrestValue).join(',')})`]
      : []),
  ];
  const { data, error } = await supabase
    .from('books')
    .select('isbn, provider_item_id')
    .eq('user_id', userId)
    .or(filters.join(','));

  if (error) {
    // 확인을 못 했다고 매칭까지 버리지 않는다 — 등록 API 가 한 번 더 걸러 준다
    console.warn('일괄 등록 중복 확인 실패:', error.message);
    return { isbns: [], providerItemIds: [] };
  }

  return {
    isbns: data.map((b) => b.isbn),
    providerItemIds: data.flatMap((b) =>
      b.provider_item_id ? [b.provider_item_id] : []
    ),
  };
};

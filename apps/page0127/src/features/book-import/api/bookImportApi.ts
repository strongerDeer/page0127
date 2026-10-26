import { apiClient } from '@/shared/api/client';

import type {
  ImportBookPayload,
  ImportResponse,
  MatchQuery,
  MatchResponse,
} from '../model/types';

export const bookImportApi = {
  /** POST /api/books/import/match — 줄들을 책으로 찾는다 (MATCH_BATCH_SIZE 줄씩) */
  match: async (rows: MatchQuery[]): Promise<MatchResponse> => {
    const response = await apiClient.post<MatchResponse>(
      '/books/import/match',
      { rows }
    );
    return response.data;
  },

  /** POST /api/books/import — 고른 책들을 한 번에 담는다 */
  importBooks: async (books: ImportBookPayload[]): Promise<ImportResponse> => {
    const response = await apiClient.post<ImportResponse>('/books/import', {
      books,
    });
    return response.data;
  },
};

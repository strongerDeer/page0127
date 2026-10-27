import { handleBulkAction } from '../../_helpers/bulkAction';
export async function POST(request: Request) {
  return handleBulkAction(request, 'books');
}

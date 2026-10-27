export const MAX_BULK_SELECTION = 500;
export type BookBulkAction = 'public' | 'private' | 'delete';
export type NotificationBulkAction = 'delete_selected' | 'delete_read';
export type BulkRequest = {
  requestId: string;
  action: BookBulkAction | NotificationBulkAction;
  ids: string[];
  before?: string;
};
export type BulkResult = { count: number; ids: string[] };

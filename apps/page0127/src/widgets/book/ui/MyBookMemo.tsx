import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Book } from '@/entities/book/types';
import { getSupabaseClient, getCurrentUser } from '@/app/api/_helpers/auth';

interface MyBookMemoProps {
  isbn: string;
}

export default async function MyBookMemo({ isbn }: MyBookMemoProps) {
  const supabase = await getSupabaseClient();
  const { user } = await getCurrentUser();

  if (!user) return null;

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .eq('isbn', isbn)
    .single();

  if (!book) return null; // Not in library, nothing to show

  const myBook = book as Book;

  return (
    <div className="space-y-6">
        <h2 className="text-xl font-bold">나의 기록</h2>
        <Card className="bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
                {/* Status & Rating */}
                <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        myBook.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        myBook.status === 'reading' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                        {myBook.status === 'completed' ? '완독함' :
                         myBook.status === 'reading' ? '읽는 중' : '읽고 싶은 책'}
                    </span>

                    {myBook.rating !== null && (
                        <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="fill-current w-4 h-4" />
                            <span className="font-bold">{myBook.rating}</span>
                        </div>
                    )}
                </div>

                {/* One Line Review */}
                {myBook.one_line_review && (
                    <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                        <p className="font-medium text-gray-700">"{myBook.one_line_review}"</p>
                    </div>
                )}

                {/* Memo */}
                {myBook.personal_memo && (
                    <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-semibold text-gray-800">메모</p>
                        <p className="whitespace-pre-wrap">{myBook.personal_memo}</p>
                    </div>
                )}

                {/* Tags */}
                {myBook.tags && myBook.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {myBook.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Empty State message if nothing recorded */}
                {!myBook.one_line_review && !myBook.personal_memo && (
                    <p className="text-sm text-gray-400 italic">아직 기록된 내용이 없습니다.</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

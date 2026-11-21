import { notFound } from 'next/navigation';

import { getAdminGuide } from '@/features/admin-book-guides/api/getAdminGuides';
import { GuideEditor } from '@/features/admin-book-guides/ui/GuideEditor';

export default async function AdminGuideEditPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(bookId)) notFound();
  const guide = await getAdminGuide(bookId);
  if (!guide) notFound();

  return (
    <>
      {/* 저장된 값이 지금 스키마와 안 맞으면(스키마가 바뀐 뒤 등) 원본을 보여 주고 빈 편집기로 연다 */}
      {guide.sections === null && (
        <div
          role='alert'
          className='mb-4 rounded-xl border border-destructive p-3 text-sm'
        >
          저장된 가이드가 지금 형식과 맞지 않아 편집기를 비워서 열었어요. 아래
          원본을 &quot;JSON 전체 고치기&quot;에 붙여 넣고 고쳐 주세요.
          <pre className='mt-2 max-h-60 overflow-auto text-xs'>
            {JSON.stringify(guide.rawSections, null, 2)}
          </pre>
        </div>
      )}
      <GuideEditor
        bookId={guide.book.id}
        bookTitle={guide.book.title}
        initialStatus={guide.status}
        initialSections={guide.sections ?? []}
      />
    </>
  );
}

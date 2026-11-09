import { getAdminSentences } from '@/features/admin-sentences/api/getAdminSentences';
import { AdminSentenceManager } from '@/features/admin-sentences/ui/AdminSentenceManager';

export default async function AdminSentencesPage() {
  const sentences = await getAdminSentences();
  return (
    <section>
      <h1 className='mb-1 text-base font-medium'>오늘의 문장</h1>
      <p className='mb-4 text-xs text-text-subtle'>
        사용자가 서재에서 하루 한 번 펼치는 문장 풀이에요. 표시·공유 허락을
        확인한 문장만 넣어 주세요.
      </p>
      <AdminSentenceManager sentences={sentences} />
    </section>
  );
}

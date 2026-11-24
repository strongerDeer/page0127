import { getAdminSentences } from '@/features/admin-sentences/api/getAdminSentences';
import { getSentenceDrawStats } from '@/features/admin-sentences/api/getSentenceDrawStats';
import { AdminSentenceManager } from '@/features/admin-sentences/ui/AdminSentenceManager';
import { SentenceDrawStats } from '@/features/admin-sentences/ui/SentenceDrawStats';

/**
 * 이 화면의 서버 액션(표지 채우기·전체 도서에 넣기)은 서점 API 를 천천히 여러 번 불러
 * 수십 초 걸릴 수 있다(2026-11-18, 74권 ≈ 30초). 기본 제한 시간에 끊기지 않게 늘린다.
 */
export const maxDuration = 120;

export default async function AdminSentencesPage() {
  const [sentences, stats] = await Promise.all([
    getAdminSentences(),
    getSentenceDrawStats(),
  ]);
  return (
    <section>
      <h1 className='mb-1 text-base font-medium'>오늘의 문장</h1>
      <p className='mb-4 text-xs text-text-subtle'>
        사용자가 서재에서 하루 한 번 펼치는 문장 풀이에요. 표시·공유 허락을
        확인한 문장만 넣어 주세요.
      </p>
      <SentenceDrawStats stats={stats} sentences={sentences} />
      <AdminSentenceManager sentences={sentences} />
    </section>
  );
}

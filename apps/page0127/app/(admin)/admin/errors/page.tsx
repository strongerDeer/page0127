import { getSentryIssues } from '@/features/admin-errors/api/getSentryIssues';
import { ErrorList } from '@/features/admin-errors/ui/ErrorList';
import { KakaoAlertStatus } from '@/features/admin-errors/ui/KakaoAlertStatus';
import { ResolutionLog } from '@/features/admin-errors/ui/ResolutionLog';

export default async function AdminErrorsPage({
  searchParams,
}: {
  // 카카오 알림 연결(callback) 결과 — ?kakao=connected|error&reason=…&missing=…
  searchParams: Promise<{ kakao?: string; reason?: string; missing?: string }>;
}) {
  const sp = await searchParams;
  // 조회와 화면이 같은 기준 시각을 쓰도록 한 번만 만들어 넘긴다.
  const now = new Date();
  const result = await getSentryIssues(now);

  return (
    <section className='space-y-4'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-base font-medium'>에러</h1>
        <span className='text-xs text-text-subtle'>
          운영 환경(production) · 5분 캐시
        </span>
      </div>
      <KakaoAlertStatus
        result={sp.kakao}
        reason={sp.reason}
        missing={sp.missing}
      />
      <ErrorList result={result} now={now} />
      {/* Sentry 조회 실패와 무관하게 보이도록 목록 밖에 둔다 */}
      <ResolutionLog />
    </section>
  );
}

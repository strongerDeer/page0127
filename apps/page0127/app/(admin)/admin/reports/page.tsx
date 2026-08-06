import { getReports } from '@/features/admin-reports/api/getReports';
import { ReportList } from '@/features/admin-reports/ui/ReportList';

export default async function AdminReportsPage() {
  const reports = await getReports();
  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <section className='space-y-4'>
      <div>
        <h1 className='text-base font-medium'>신고</h1>
        <p className='mt-1 text-sm text-text-subtle'>
          미처리 {pendingCount}건 · 전체 {reports.length}건. 숨긴 댓글은 화면에서
          사라지지만 기록은 남습니다.
        </p>
      </div>
      <ReportList reports={reports} />
    </section>
  );
}

import { getQualityDashboard } from '@/features/admin-quality/api/getQualityDashboard';
import { FieldTrendChart } from '@/features/admin-quality/ui/FieldTrendChart';
import { PageScoreTable } from '@/features/admin-quality/ui/PageScoreTable';
import { QualityReport } from '@/features/admin-quality/ui/QualityReport';
import { QualitySummary } from '@/features/admin-quality/ui/QualitySummary';
import { RegressionBanner } from '@/features/admin-quality/ui/RegressionBanner';

export default async function AdminQualityPage() {
  const { latest, fieldHistory } = await getQualityDashboard();

  if (!latest) {
    return (
      <section>
        <h1 className='mb-4 text-base font-semibold'>품질</h1>
        <p className='text-sm text-text-faint'>
          아직 측정 데이터가 없습니다. 품질 워크플로우가 처음 실행되면 표시됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className='space-y-4'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-base font-semibold'>품질</h1>
        <span className='text-xs text-text-faint'>
          측정 {new Date(latest.timestamp).toLocaleString('ko-KR')} · {latest.gitRef}
        </span>
      </div>
      <RegressionBanner record={latest} />
      <QualitySummary record={latest} />
      <PageScoreTable record={latest} />
      <FieldTrendChart rows={fieldHistory} />
      <QualityReport md={latest.analysisComment ?? null} />
    </section>
  );
}

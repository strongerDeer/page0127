import { getQualityDashboard } from '@/features/admin-quality/api/getQualityDashboard';
import { buildTrendPayload } from '@/features/admin-quality/lib/metrics';
import { BundlePanel } from '@/features/admin-quality/ui/BundlePanel';
import { CodeHealthPanel } from '@/features/admin-quality/ui/CodeHealthPanel';
import { FieldTrendChart } from '@/features/admin-quality/ui/FieldTrendChart';
import { QualityGrid } from '@/features/admin-quality/ui/QualityGrid';
import { QualityReport } from '@/features/admin-quality/ui/QualityReport';
import { QualitySummary } from '@/features/admin-quality/ui/QualitySummary';
import { QualityTrend } from '@/features/admin-quality/ui/QualityTrend';
import { RegressionBanner } from '@/features/admin-quality/ui/RegressionBanner';
import { SeoPanel } from '@/features/admin-quality/ui/SeoPanel';

export default async function AdminQualityPage() {
  const { latest, records, fieldHistory } = await getQualityDashboard();

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

  const trend = buildTrendPayload(records);

  return (
    <section className='space-y-6'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-base font-semibold'>품질</h1>
        <span className='text-xs text-text-faint'>
          측정 {new Date(latest.timestamp).toLocaleString('ko-KR')} · {latest.gitRef}
        </span>
      </div>

      <RegressionBanner record={latest} />

      {/* 확정안: 한눈에 그리드 → 추세 자세히 */}
      <QualityGrid data={trend} />
      <QualityTrend data={trend} />

      {/* 실사용자(CrUX) — 트래픽 쌓이면 채워짐 */}
      <QualitySummary record={latest} />
      <FieldTrendChart rows={fieldHistory} />

      {/* 그 외 점검 */}
      <SeoPanel record={latest} />
      <BundlePanel record={latest} />
      <CodeHealthPanel record={latest} />

      <QualityReport md={latest.analysisComment ?? null} />
    </section>
  );
}

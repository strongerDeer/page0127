import { buildTrendPayload } from '@/features/admin-quality/lib/metrics';
import { BundlePanel } from '@/features/admin-quality/ui/BundlePanel';
import { CodeHealthPanel } from '@/features/admin-quality/ui/CodeHealthPanel';
import { FieldComparisonTable } from '@/features/admin-quality/ui/FieldComparisonTable';
import { QualityGrid } from '@/features/admin-quality/ui/QualityGrid';
import { QualityReport } from '@/features/admin-quality/ui/QualityReport';
import { QualityTrend } from '@/features/admin-quality/ui/QualityTrend';
import { RegressionBanner } from '@/features/admin-quality/ui/RegressionBanner';
import { RumTrendChart } from '@/features/admin-quality/ui/RumTrendChart';
import { SeoPanel } from '@/features/admin-quality/ui/SeoPanel';

import { DemoPanel } from '@/widgets/demo-admin';
import { assertDemoViewer } from '@/widgets/demo-admin/api/assertDemoViewer';
import {
  demoQualityRecords,
  demoRum,
} from '@/widgets/demo-admin/model/demoQuality';

export const dynamic = 'force-dynamic';

/**
 * 데모 품질 — 실제 /admin/quality 와 같은 패널에 8주치 예시 측정 기록을 넣는다.
 * CrUX 주간 추세(FieldTrendChart)는 별도 표(quality_field_history) 모양이라 뺐다.
 */
export default async function DemoQualityPage() {
  await assertDemoViewer();
  const now = new Date();
  const records = demoQualityRecords(now);
  const latest = records[records.length - 1];
  const rum = demoRum(now);
  const trend = buildTrendPayload(records);

  return (
    <section className='space-y-6'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-base font-medium'>품질</h1>
        <span className='text-xs text-text-subtle'>
          측정 {new Date(latest.timestamp).toLocaleDateString('ko-KR')} · 예시
        </span>
      </div>

      <DemoPanel>
        <RegressionBanner
          record={latest}
          previous={records[records.length - 2]}
        />
      </DemoPanel>
      <DemoPanel>
        <QualityReport
          md={latest.analysisComment ?? null}
          regressionCount={latest.regressions?.length}
        />
      </DemoPanel>
      <DemoPanel>
        <QualityGrid data={trend} />
      </DemoPanel>
      <DemoPanel>
        <QualityTrend data={trend} />
      </DemoPanel>
      <DemoPanel>
        <FieldComparisonTable record={latest} rum={rum} />
      </DemoPanel>
      <DemoPanel>
        <RumTrendChart rum={rum} />
      </DemoPanel>
      <DemoPanel>
        <SeoPanel record={latest} />
      </DemoPanel>
      <DemoPanel>
        <BundlePanel record={latest} />
      </DemoPanel>
      <DemoPanel>
        <CodeHealthPanel record={latest} />
      </DemoPanel>
    </section>
  );
}

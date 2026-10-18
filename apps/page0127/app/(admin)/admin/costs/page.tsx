import { getCostSummary } from '@/features/admin-costs/api/getCostSummary';
import { getOpenAiCosts } from '@/features/admin-costs/api/getOpenAiCosts';
import { CostDashboard } from '@/features/admin-costs/ui/CostDashboard';

export default async function AdminCostsPage() {
  // 운영 앱 기록과 OpenAI 실제 청구액(로컬·테스트 포함)을 함께 — 실제 청구는 실패해도 결과 타입으로 온다
  const [summary, actual] = await Promise.all([
    getCostSummary(),
    getOpenAiCosts(),
  ]);
  return (
    <section>
      <h1 className='mb-4 text-base font-medium'>AI 비용</h1>
      <CostDashboard summary={summary} actual={actual} />
    </section>
  );
}

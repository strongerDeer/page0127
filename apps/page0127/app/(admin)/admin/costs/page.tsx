import { getCostSummary } from '@/features/admin-costs/api/getCostSummary';
import { CostDashboard } from '@/features/admin-costs/ui/CostDashboard';

export default async function AdminCostsPage() {
  const summary = await getCostSummary();
  return (
    <section>
      <h1 className='mb-4 text-base font-semibold'>AI 비용</h1>
      <CostDashboard summary={summary} />
    </section>
  );
}

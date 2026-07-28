import type { QualityRecord } from '@repo/quality/types';

const Badge = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
      ok
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
        : 'bg-red-50 text-red-700 ring-red-600/20'
    }`}
  >
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${
        ok ? 'bg-emerald-500' : 'bg-red-500'
      }`}
    />
    {label}
  </span>
);

// SEO 점검 — record.seo의 불리언 6종을 정상/위험 배지로. brokenLinks는 0이어야 정상.
export const SeoPanel = ({ record }: { record: QualityRecord }) => {
  const s = record.seo;
  const checks: { label: string; ok: boolean }[] = [
    { label: '다국어 태그(hreflang)', ok: s.hreflangValid },
    { label: 'canonical', ok: s.canonicalValid },
    { label: 'sitemap', ok: s.sitemapOk },
    { label: 'robots', ok: s.robotsOk },
    { label: '구조화 데이터(JSON-LD)', ok: s.jsonLdPresent },
    { label: `깨진 링크 ${s.brokenLinks}개`, ok: s.brokenLinks === 0 },
  ];

  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-medium'>SEO 점검</h2>
      <div className='flex flex-wrap gap-2'>
        {checks.map((c) => (
          <Badge key={c.label} ok={c.ok} label={c.label} />
        ))}
      </div>
    </section>
  );
};

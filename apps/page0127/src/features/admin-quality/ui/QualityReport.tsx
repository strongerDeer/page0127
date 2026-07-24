import ReactMarkdown from 'react-markdown';

export function QualityReport({ md }: { md: string | null }) {
  if (!md) return null;
  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>측정 리포트</h2>
      <div className='prose prose-sm max-w-none'>
        <ReactMarkdown>{md}</ReactMarkdown>
      </div>
    </section>
  );
}

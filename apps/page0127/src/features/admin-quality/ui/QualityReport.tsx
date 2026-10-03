import ReactMarkdown, { type Components } from 'react-markdown';

type QualityReportProps = { md: string | null };

// 요소별 스타일을 직접 준다. 예전엔 `prose` 클래스에 맡겼는데 이 레포엔
// @tailwindcss/typography 플러그인이 없어 아무 효과가 없었고, Tailwind 기본
// 초기화(preflight)가 목록 글머리표·여백을 지워 항목들이 한 덩어리로 붙어 보였다.
const markdownComponents: Components = {
  p: ({ children }) => <p className='mb-3 last:mb-0'>{children}</p>,
  ul: ({ children }) => (
    <ul className='mb-3 list-disc space-y-1.5 pl-5'>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className='mb-3 list-decimal space-y-1.5 pl-5'>{children}</ol>
  ),
  strong: ({ children }) => (
    <strong className='font-medium text-foreground'>{children}</strong>
  ),
  code: ({ children }) => (
    <code className='rounded bg-muted px-1 py-0.5 text-xs'>{children}</code>
  ),
};

export const QualityReport = ({ md }: QualityReportProps) => {
  if (!md) return null;
  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-medium'>측정 리포트</h2>
      <div className='text-sm leading-relaxed'>
        <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>
      </div>
    </section>
  );
};

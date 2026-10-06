import ReactMarkdown, { type Components } from 'react-markdown';

import { parseQualityReport } from '../lib/parseReport';

type QualityReportProps = {
  md: string | null;
  /** 이번 측정의 회귀 건수. undefined = 기록 없는 옛 레코드(0 과 다르다) */
  regressionCount?: number;
};

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

// 조각 하나(한 줄)를 렌더할 때는 <p> 대신 <span> — 카드 안 레이아웃을 깨지 않게
const inlineComponents: Components = {
  ...markdownComponents,
  p: ({ children }) => <span>{children}</span>,
};

type InlineProps = { text: string };

const Inline = ({ text }: InlineProps) => (
  <ReactMarkdown components={inlineComponents}>{text}</ReactMarkdown>
);

type VerdictProps = { count?: number };

/** 판정은 생성형 글이 아니라 측정 데이터(회귀 건수)로 정한다 — 글은 틀릴 수 있다 */
const Verdict = ({ count }: VerdictProps) => {
  if (count === undefined) return null;
  return count > 0 ? (
    <span className='rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700'>
      ! 나빠진 항목 {count}건
    </span>
  ) : (
    <span className='rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700'>
      ✓ 나빠진 항목 없음
    </span>
  );
};

/**
 * 주간 측정 리포트 — 결론부터.
 * 핵심 한 문장 → 이번 주 할 일(카드) → 근거(접힘). 틀을 벗어난 글은 원문 그대로.
 */
export const QualityReport = ({ md, regressionCount }: QualityReportProps) => {
  if (!md) return null;
  const parsed = parseQualityReport(md);

  if (!parsed) {
    return (
      <section className='rounded-lg border border-line p-4'>
        <h2 className='mb-3 text-sm font-medium'>측정 리포트</h2>
        <div className='text-sm leading-relaxed'>
          <ReactMarkdown components={markdownComponents}>{md}</ReactMarkdown>
        </div>
      </section>
    );
  }

  return (
    <section className='space-y-4 rounded-lg border border-line p-4'>
      <div>
        <div className='flex flex-wrap items-center gap-2'>
          <h2 className='text-sm font-medium'>이번 주 측정 리포트</h2>
          <Verdict count={regressionCount} />
        </div>
        <p className='mt-2 text-base leading-relaxed'>
          <Inline text={parsed.headline} />
        </p>
      </div>

      <div>
        <h3 className='mb-2 text-xs font-medium text-text-subtle'>
          이번 주 할 일
        </h3>
        <ol className='grid gap-3 md:grid-cols-3'>
          {parsed.actions.map((a, i) => (
            <li key={a.title} className='rounded-lg bg-sunken p-3'>
              <div className='flex gap-2'>
                <span className='text-sm font-bold tabular-nums text-text-subtle'>
                  {i + 1}
                </span>
                <div>
                  <p className='text-sm font-medium'>
                    <Inline text={a.title} />
                  </p>
                  {a.body && (
                    <p className='mt-1 text-xs leading-relaxed text-text-subtle'>
                      <Inline text={a.body} />
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {parsed.findings.length > 0 && (
        <details>
          <summary className='cursor-pointer text-xs font-medium text-text-subtle'>
            근거 — 주요 발견 {parsed.findings.length}건
          </summary>
          <ul className='mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed'>
            {parsed.findings.map((f) => (
              <li key={f}>
                <Inline text={f} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

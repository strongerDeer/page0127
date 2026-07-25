import type { QualityRecord } from '@repo/quality/types';

type Sev = 'error' | 'warn' | 'info';

// 카운트가 0이면 회색(정상), >0이면 심각도 색. 에러류는 0이어야 정상.
const valueClass = (n: number, sev: Sev) => {
  if (n === 0) return 'text-text-faint';
  if (sev === 'error') return 'text-red-600';
  if (sev === 'warn') return 'text-amber-600';
  return 'text-gray-900';
};

const Stat = ({
  label,
  value,
  sev,
}: {
  label: string;
  value: number;
  sev: Sev;
}) => (
  <div className='rounded-md border border-line px-3 py-2.5'>
    <div className={`text-xl font-semibold tabular-nums ${valueClass(value, sev)}`}>
      {value}
    </div>
    <div className='mt-0.5 text-xs text-text-faint'>{label}</div>
  </div>
);

// 코드 상태 — 빌드 시점 코드헬스 + 페이지 런타임. 에러류(TS/ESLint/콘솔/요청실패/hydration)는 0이 정상.
export const CodeHealthPanel = ({ record }: { record: QualityRecord }) => {
  const c = record.codeHealth;
  const r = record.runtime;
  const items: { label: string; value: number; sev: Sev }[] = [
    { label: 'TS 에러', value: c.tscErrors, sev: 'error' },
    { label: 'ESLint 에러', value: c.eslintErrors, sev: 'error' },
    { label: 'ESLint 경고', value: c.eslintWarnings, sev: 'warn' },
    { label: 'TODO/FIXME', value: c.todoFixme, sev: 'info' },
    { label: '콘솔 에러', value: r.consoleErrors, sev: 'error' },
    { label: '콘솔 경고', value: r.consoleWarnings, sev: 'warn' },
    { label: '요청 실패', value: r.failedRequests, sev: 'error' },
    { label: 'hydration 경고', value: r.hydrationWarnings, sev: 'error' },
  ];

  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>코드 상태</h2>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
        {items.map((it) => (
          <Stat key={it.label} label={it.label} value={it.value} sev={it.sev} />
        ))}
      </div>
    </section>
  );
};

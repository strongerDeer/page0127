import Link from 'next/link';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { AttentionItem } from '../lib/attention';

type AttentionListProps = { items: AttentionItem[] };

const TONE_CLS: Record<AttentionItem['tone'], string> = {
  danger:
    'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10',
  warn: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
};

/** 홈 맨 위 — 손댈 것만. 없으면 한 줄로 "없음"을 말해 화면이 비어 보이지 않게 한다 */
export const AttentionList = ({ items }: AttentionListProps) => (
  <section>
    <h2 className='mb-3 text-sm font-medium'>오늘 볼 것</h2>
    {items.length === 0 ? (
      <p className='flex items-center gap-2 rounded-lg border border-line p-4 text-sm text-text-subtle'>
        <CheckCircle2 aria-hidden className='size-4 text-emerald-600' />
        처리할 일 없음
      </p>
    ) : (
      <ul className='flex flex-col gap-2'>
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${TONE_CLS[item.tone]}`}
            >
              <AlertTriangle aria-hidden className='size-5' />
              <span className='text-sm font-medium'>{item.text}</span>
              <span className='ml-auto text-xs text-text-subtle'>
                확인하기 →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </section>
);

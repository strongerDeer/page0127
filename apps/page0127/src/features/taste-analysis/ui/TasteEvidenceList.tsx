import Link from 'next/link';

import { BookCover } from '@repo/ui';

import { toCoverSource } from '@/entities/book';

import type { TasteEvidence } from '@/entities/taste-analysis/types';

type TasteEvidenceListProps = {
  evidence: TasteEvidence[];
  /**
   * full: 표지·제목·근거 한 줄·주제 태그 (분석 결과 상세)
   * compact: 표지만 몇 권 — 누르면 그 책 기록으로 (서재 상단 취향 카드)
   */
  variant: 'full' | 'compact';
  /** compact 에서 표지를 누르면 갈 책 기록 주소 — 없으면 링크 없이 표지만 */
  bookHref?: (bookId: string) => string;
};

/** compact 에서 세우는 표지 수 — 카드 한 줄에 들어가는 만큼 */
const COMPACT_LIMIT = 3;

/**
 * 취향 노트의 근거 — "이 책들에서 이렇게 읽었어요".
 *
 * 왜 필요한가: "좋았던 한 권을 오래 곱씹는 분"처럼 누구에게나 맞는 문장(바넘 효과)은
 * 근거가 없으면 운세처럼 읽힌다. 내 책장의 어떤 책에서 나온 말인지 보여야 내 얘기가 된다.
 *
 * 근거는 분석에 넣은 실제 책과 맞춘 것만 저장된다(entities/taste-analysis/model/evidence).
 * 비어 있으면(근거 없는 옛 분석·방문자에게 공개 근거가 없을 때) 아무것도 그리지 않는다.
 */
export const TasteEvidenceList = ({
  evidence,
  variant,
  bookHref,
}: TasteEvidenceListProps) => {
  if (evidence.length === 0) return null;

  if (variant === 'compact') {
    return (
      <div className='flex items-center gap-3'>
        <span className='shrink-0 text-xs text-text-subtle'>
          이 책들에서 읽었어요
        </span>
        <ul className='flex items-end gap-1.5'>
          {evidence.slice(0, COMPACT_LIMIT).map((item) => {
            const cover = (
              <BookCover
                {...toCoverSource(item)}
                title={item.title}
                size='xs'
              />
            );
            return (
              <li key={item.book_id} title={item.title}>
                {bookHref ? (
                  <Link
                    href={bookHref(item.book_id)}
                    prefetch={false}
                    className='block rounded-sm transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none'
                  >
                    {cover}
                  </Link>
                ) : (
                  cover
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <section aria-labelledby='taste-evidence-title'>
      <h3
        id='taste-evidence-title'
        className='text-sm font-medium text-text-subtle'
      >
        이 책들에서 이렇게 읽었어요
      </h3>
      <ul className='mt-3 space-y-4'>
        {evidence.map((item) => (
          <li key={item.book_id} className='flex gap-4'>
            <BookCover
              {...toCoverSource(item)}
              title={item.title}
              decorative
              size='sm'
            />
            <div className='min-w-0 flex-1'>
              <p className='break-keep font-medium text-text-strong'>
                {item.title}
              </p>
              <p className='mt-1 break-keep text-sm leading-relaxed text-text-body'>
                {item.reason}
              </p>
              {item.topics.length > 0 && (
                <ul className='mt-2 flex flex-wrap gap-1'>
                  {item.topics.map((topic) => (
                    <li
                      key={topic}
                      className='rounded-full bg-accent px-2 py-0.5 text-xs text-text-body'
                    >
                      #{topic}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

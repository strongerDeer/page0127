import { BookCover } from '@repo/ui';

import { toCoverSource } from '@/entities/book';

import type { TasteEvidence } from '@/entities/taste-analysis/types';

type TasteEvidenceListProps = {
  /** 표지·제목·근거 한 줄·주제 태그 (분석 결과 상세) */
  evidence: TasteEvidence[];
};

/**
 * 취향 노트의 근거 — "이 책들에서 이렇게 읽었어요".
 *
 * 왜 필요한가: "좋았던 한 권을 오래 곱씹는 분"처럼 누구에게나 맞는 문장(바넘 효과)은
 * 근거가 없으면 운세처럼 읽힌다. 내 책장의 어떤 책에서 나온 말인지 보여야 내 얘기가 된다.
 *
 * 근거는 분석에 넣은 실제 책과 맞춘 것만 저장된다(entities/taste-analysis/model/evidence).
 * 비어 있으면(근거 없는 옛 분석·방문자에게 공개 근거가 없을 때) 아무것도 그리지 않는다.
 */
export const TasteEvidenceList = ({ evidence }: TasteEvidenceListProps) => {
  if (evidence.length === 0) return null;

  // 서재 상단 카드의 표지만 보이던 compact 모양은 2026-11-24 카드와 함께 없앴다
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

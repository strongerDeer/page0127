import { Feather, Quote, Sparkles } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';

import { TasteEvidenceList } from '@/features/taste-analysis/ui/TasteEvidenceList';

import type { TasteEvidence } from '@/entities/taste-analysis/types';

/** 랜딩에서 보여주는 독서 취향 분석 결과 예시 */
const EXAMPLE = {
  personalityType: '마음의 결을 읽는 사람',
  description:
    '책장에 사람의 마음을 들여다보는 책이 많습니다. 소설 속 인물의 감정을 천천히 따라가고, 에세이에서 위로를 찾는 편이네요. 빠르게 많이 읽기보다, 좋았던 한 권을 오래 곱씹는 분입니다.',
  likedTopics: ['심리', '관계', '성장'],
  likedStyles: ['담담한 문체', '긴 호흡의 이야기'],
} as const;

/**
 * 예시의 근거 책 — 실제 분석 결과처럼 "이 책들에서 이렇게 읽었다"를 보여 준다.
 * 근거 없는 성향 문장은 누구에게나 맞는 말(바넘 효과)로 읽힌다. 예시부터 근거가 있어야
 * "내 책장으로 만들어진다"는 말이 믿긴다.
 * 예시 성향(심리·관계·성장)과 맞는 책을 홈 맛보기 목록(shelf-preview/config/picks)에서 골랐다 —
 * 표지 데이터가 global_books 에 있다.
 */
const EXAMPLE_EVIDENCE = [
  {
    isbn: '8936434594',
    title: '채식주의자',
    reason: '말해지지 않은 마음을 끝까지 따라가는 시선',
    topics: ['심리', '관계'],
  },
  {
    isbn: '9791160946918',
    title: '어린이라는 세계',
    reason: '작은 존재의 감정을 오래 들여다보는 다정함',
    topics: ['관계', '성장'],
  },
  {
    isbn: '9788936812621',
    title: '빅터 프랭클의 죽음의 수용소에서',
    reason: '고통 속에서도 삶의 의미를 붙드는 마음',
    topics: ['심리', '성장'],
  },
] as const;

type CoverRow = { isbn: string; cover_image: string | null };

export const TasteExampleCard = async () => {
  // 표지만 DB 에서 — 못 받아도 근거는 그대로 선다(BookCover 가 제목을 조판한다)
  const supabase = await createClient();
  const { data } = await supabase
    .from('global_books')
    .select('isbn, cover_image')
    .in(
      'isbn',
      EXAMPLE_EVIDENCE.map((book) => book.isbn)
    );
  const coverByIsbn = new Map(
    ((data as CoverRow[] | null) ?? []).map((row) => [
      row.isbn,
      row.cover_image,
    ])
  );
  const evidence: TasteEvidence[] = EXAMPLE_EVIDENCE.map((book) => ({
    book_id: book.isbn,
    title: book.title,
    cover_image: coverByIsbn.get(book.isbn) ?? null,
    reason: book.reason,
    topics: [...book.topics],
  }));

  return (
    <article className='relative overflow-hidden rounded-2xl border border-line-soft bg-card p-6 text-left md:p-8'>
      <Quote
        aria-hidden='true'
        className='absolute -right-2 -top-3 size-24 text-primary/[0.06]'
      />

      <div className='flex items-start justify-between gap-5'>
        <div className='min-w-0'>
          {/* "예시" 표시 — 로그인한 0권 사용자에게도 이 카드가 보인다.
              표시가 없으면 내 분석 결과가 이미 나온 것처럼 읽힌다. */}
          <p className='flex items-center gap-1.5 text-xs font-medium text-primary'>
            <Sparkles aria-hidden='true' className='size-3.5' />
            TASTE NOTE 0127
            <span className='ml-1 rounded-full border border-line-soft bg-sunken px-2 py-0.5 text-[11px] text-text-subtle'>
              예시
            </span>
          </p>
          <h3 className='mt-3 text-2xl font-bold leading-tight text-text-strong md:text-3xl'>
            {EXAMPLE.personalityType}
          </h3>
        </div>
      </div>

      <p className='mt-5 max-w-2xl break-keep text-base leading-[1.8] text-text-body'>
        {EXAMPLE.description}
      </p>

      <div className='mt-6 border-t border-line-soft pt-5'>
        <TasteEvidenceList evidence={evidence} variant='full' />
      </div>

      <div className='mt-7 grid gap-5 border-t border-line-soft pt-5 sm:grid-cols-2'>
        <div>
          <p className='flex items-center gap-1.5 text-xs font-medium text-text-subtle'>
            <Sparkles aria-hidden='true' className='size-3.5 text-primary' />
            눈길이 머무는 주제
          </p>
          <div className='mt-2.5 flex flex-wrap gap-1.5'>
            {EXAMPLE.likedTopics.map((topic) => (
              <span
                key={topic}
                className='rounded-full bg-sunken px-3 py-1.5 text-sm font-medium text-text-body'
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className='flex items-center gap-1.5 text-xs font-medium text-text-subtle'>
            <Feather aria-hidden='true' className='size-3.5 text-primary' />
            좋아하는 문장의 결
          </p>
          <div className='mt-2.5 flex flex-wrap gap-1.5'>
            {EXAMPLE.likedStyles.map((style) => (
              <span
                key={style}
                className='rounded-full bg-sunken px-3 py-1.5 text-sm font-medium text-text-body'
              >
                {style}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className='mt-5 text-xs text-text-subtle'>
        예시 결과예요. 내 취향 노트는 내 책장으로 만들어져요.
      </p>
    </article>
  );
};

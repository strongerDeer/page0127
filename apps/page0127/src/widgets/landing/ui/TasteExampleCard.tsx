import Image from 'next/image';

import { Feather, Quote, Sparkles } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';

/** 랜딩에서 보여주는 독서 취향 분석 결과 예시 */
const EXAMPLE = {
  personalityType: '마음의 결을 읽는 사람',
  description:
    '책장에 사람의 마음을 들여다보는 책이 많습니다. 소설 속 인물의 감정을 천천히 따라가고, 에세이에서 위로를 찾는 편이네요. 빠르게 많이 읽기보다, 좋았던 한 권을 오래 곱씹는 분입니다.',
  likedTopics: ['심리', '관계', '성장'],
  likedStyles: ['담담한 문체', '긴 호흡의 이야기'],
} as const;

const COVER_POSITIONS = [
  'left-0 top-3 -rotate-6',
  'left-9 top-0 z-10 rotate-1',
  'left-[72px] top-4 rotate-6',
] as const;

type CoverRow = { cover_image: string | null };

export const TasteExampleCard = async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('global_books')
    .select('cover_image')
    .not('cover_image', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  const covers = ((data as CoverRow[] | null) ?? [])
    .map((book) => book.cover_image)
    .filter((cover): cover is string => Boolean(cover));

  return (
    <article className='relative overflow-hidden rounded-2xl border border-line-soft bg-card p-6 text-left md:p-8'>
      <Quote
        aria-hidden='true'
        className='absolute -right-2 -top-3 size-24 text-primary/[0.06]'
      />

      <div className='flex items-start justify-between gap-5'>
        <div className='min-w-0'>
          <p className='flex items-center gap-1.5 text-xs font-semibold text-primary'>
            <Sparkles aria-hidden='true' className='size-3.5' />
            TASTE NOTE 0127
          </p>
          <h3 className='mt-3 text-[26px] font-bold leading-tight text-text-strong md:text-[30px]'>
            {EXAMPLE.personalityType}
          </h3>
        </div>

        {covers.length > 0 && (
          <div
            aria-hidden='true'
            className='relative hidden h-28 w-36 shrink-0 sm:block'
          >
            {covers.map((cover, index) => (
              <Image
                key={cover}
                src={cover}
                alt=''
                width={64}
                height={92}
                className={`book-cover absolute h-24 w-auto border-2 border-white ${COVER_POSITIONS[index]}`}
              />
            ))}
          </div>
        )}
      </div>

      <p className='mt-5 max-w-2xl break-keep text-[15px] leading-[1.8] text-text-body'>
        {EXAMPLE.description}
      </p>

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
                className='rounded-full bg-sunken px-3 py-1.5 text-[13px] font-medium text-text-body'
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
                className='rounded-full bg-sunken px-3 py-1.5 text-[13px] font-medium text-text-body'
              >
                {style}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

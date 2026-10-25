import Link from 'next/link';

import { BookCover } from '@repo/ui';

import { toCoverSource } from '@/entities/book';

import type { TasteClash } from '@/entities/follow';

export const TasteClashCard = ({
  clash,
  otherName,
  mineUsername,
  otherUsername,
}: {
  clash: TasteClash | null;
  otherName?: string;
  mineUsername?: string | null;
  otherUsername?: string | null;
}) => (
  <section
    className='rounded-2xl border border-line bg-card p-5'
    aria-labelledby='taste-clash-title'
  >
    <p className='mb-2 text-xs font-semibold tracking-wider text-primary'>
      SAME BOOK, DIFFERENT TASTE
    </p>
    <h2 id='taste-clash-title' className='text-lg font-semibold'>
      취향 대격돌
    </h2>
    {clash ? (
      <>
        <div className='mt-5 flex items-center gap-3'>
          <BookCover
            {...toCoverSource({
              cover_image: clash.coverImage,
              provider_item_id: clash.providerItemId,
            })}
            title={clash.title}
            size='sm'
            decorative
          />
          <div>
            <h3 className='font-medium'>{clash.title}</h3>
            <p className='mt-1 text-xs text-text-subtle'>
              {clash.author} · 둘 다 공개 완독한 책
            </p>
          </div>
        </div>
        <div className='my-5 grid grid-cols-2 gap-3 text-center'>
          {[
            { name: '나', rating: clash.mineRating },
            { name: otherName ?? '상대', rating: clash.otherRating },
          ].map((item) => (
            <div key={item.name} className='rounded-lg bg-sunken p-3'>
              <p className='text-sm'>{item.name}</p>
              <p className='mt-2 text-primary' aria-label={`${item.rating}점`}>
                {'★'.repeat(item.rating)}
                {'☆'.repeat(5 - item.rating)}
              </p>
            </div>
          ))}
        </div>
        <p className='text-center text-sm leading-relaxed'>
          같은 책 읽은 거 맞죠?
          <br />두 사람의 평가는 별{' '}
          <strong>
            {Math.abs(clash.mineRating - clash.otherRating)}개
          </strong>{' '}
          차이.
        </p>
        <div className='mt-5 flex flex-wrap justify-center gap-4 text-sm font-medium text-primary'>
          {mineUsername && (
            <Link
              href={`/${encodeURIComponent(mineUsername)}/${clash.mineBookId}`}
            >
              내 감상 보기 ↗
            </Link>
          )}
          {otherUsername && (
            <Link
              href={`/${encodeURIComponent(otherUsername)}/${clash.otherBookId}`}
            >
              {otherName}님 감상 보기 ↗
            </Link>
          )}
        </div>
      </>
    ) : (
      <p className='mt-4 text-sm leading-relaxed text-text-subtle'>
        아직 별점이 갈린 공통 책이 없어요.
        <br />
        같은 책을 읽고 별점을 남기면 이곳에서 만나요.
      </p>
    )}
    <p className='mt-4 text-xs leading-relaxed text-text-subtle'>
      완독 연도와 관계없이 공개 기록만 비교해요. 별점 없는 책은 제외해요.
    </p>
  </section>
);

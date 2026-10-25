import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { getReaderShareData } from '@/widgets/public-library/api/getReaderShareData';

import { SHOWCASE_USERNAME } from '../model/showcase';

/**
 * 실제 책장 한 개 보기 — "책장을 보면, 그 사람이 보인다"를 증명하는 자리.
 *
 * 왜: 홈 재검토(2026-10-25)에서 맛보기 아래로는 사람이 한 명도 나오지 않는다는 게
 * 가장 큰 구멍이었다. 이 서비스는 "공유하고 자랑하는 기록"인데, 그 결과물(서재 주소와
 * 스토리 이미지)을 가입 전에는 볼 길이 없었다. 그래서 실제 서재 하나를 그대로 보여 준다.
 *
 * 지금은 만든 사람의 서재다 — 독자가 적을 때 남의 책장을 고르면 동의를 받아야 하고,
 * "만든 사람의 책장"이라고 밝히면 규모를 과장하지 않는다(rankingTitle 과 같은 태도).
 *
 * 그 서재가 없어지거나 아이디가 바뀌면 섹션째 사라진다(랜딩을 막지 않는다).
 */
export const ShelfShowcaseSection = async () => {
  const data = await getReaderShareData(SHOWCASE_USERNAME);
  if (!data) return null;

  const { card, displayName, totalBooks } = data;
  const shelfHref = `/${SHOWCASE_USERNAME}`;

  return (
    <section
      aria-labelledby='shelf-showcase-heading'
      className='grid items-center gap-10 rounded-2xl border border-line-soft p-7 md:p-10 lg:grid-cols-[7fr_5fr] lg:gap-14'
    >
      <div className='max-w-md'>
        <p className='text-xs font-medium text-primary'>
          이런 책장이 만들어져요
        </p>
        <h2
          id='shelf-showcase-heading'
          className='mt-4 text-[28px] font-bold leading-[1.3] text-text-strong md:text-4xl'
        >
          책장은 주소가 되고,
          <br />
          <span className='text-primary'>한 장의 이미지</span>가 됩니다
        </h2>
        <p className='mt-4 break-keep text-base leading-relaxed text-text-body'>
          링크 하나로 읽은 책을 통째로 보여 주고, 인스타 스토리에 올릴 이미지도
          바로 만들어요.
        </p>

        {/* 독서 명함 — 서재 상단·공유 카드와 같은 규칙(toReaderCard)으로 그린다 */}
        <Link
          href={shelfHref}
          // 랜딩에서 한 번 보이는 링크라 미리 불러오지 않는다 (Vercel CPU)
          prefetch={false}
          className='group mt-8 flex items-center justify-between gap-4 rounded-xl border border-line bg-card px-5 py-4 transition-colors hover:border-primary/30'
        >
          <div className='min-w-0'>
            <p className='text-xs text-text-subtle'>
              page0127.을 만든 사람의 책장
            </p>
            {card.identity && (
              <p className='mt-1 flex items-center gap-2 font-bold text-text-strong'>
                <span
                  aria-hidden='true'
                  className='size-2.5 shrink-0 rounded-full'
                  style={{ backgroundColor: card.identity.color }}
                />
                <span className='truncate'>{card.identity.name}</span>
              </p>
            )}
            <p className='mt-1 truncate text-sm text-text-subtle'>
              page0127.com/{SHOWCASE_USERNAME}
              {totalBooks > 0 && ` · 기록한 책 ${totalBooks}권`}
            </p>
          </div>
          <span className='flex shrink-0 items-center gap-1 text-sm font-medium text-primary'>
            구경하기
            <ArrowRight
              aria-hidden='true'
              className='size-4 transition-transform group-hover:translate-x-0.5'
            />
          </span>
        </Link>
      </div>

      {/* 실제 공유 이미지(서재 스토리, 1080×1920) — 서재 공유 시트가 받아 가는 그 이미지다.
          서버가 그린 PNG 를 그대로 쓴다. 폴드 아래라 lazy 로 늦게 받는다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${shelfHref}/story-image`}
        alt={`${displayName}님의 서재 스토리 이미지`}
        width={1080}
        height={1920}
        loading='lazy'
        decoding='async'
        className='mx-auto aspect-9/16 h-auto w-56 rounded-2xl border border-line-soft md:w-64'
      />
    </section>
  );
};

import Link from 'next/link';

import { BookMarked, Sparkles } from 'lucide-react';

/**
 * 프로모 카드 2장 — 비비드 단색 면 (밀리 "놓치기 아쉬운 소식" 문법)
 *
 * - 가짜 이벤트가 아니라 실제 기능(공개 서재 주소 · 취향 분석)으로 연결한다
 * - 색은 브랜드 직무색 두 가지: 진한 블루 / 바이올렛
 * - 장식은 반투명 아이콘 하나만 — 일러스트 자산이 생기면 교체한다
 *
 * 면의 색은 여기 있지 않다 — @repo/ui 의 .promo-blue / .promo-violet 이 갖는다.
 * hex 로 박아 두는 동안 대비가 AA 에 미달했고(제목 4.36 · 서브 3.15), 값이
 * 컴포넌트에 흩어져 있으면 그런 미달을 한곳에서 잡을 수가 없다.
 */
type PromoCardsProps = {
  isLoggedIn: boolean;
};

export const PromoCards = ({ isLoggedIn }: PromoCardsProps) => {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      <Link
        href={isLoggedIn ? '/settings' : '/login'}
        className='promo-blue relative overflow-hidden rounded-2xl px-7 py-8 transition-transform hover:-translate-y-0.5'
      >
        <p className='text-lg font-bold leading-snug text-white'>
          책장은 주소가 됩니다
        </p>
        <p className='mt-1.5 text-sm text-white/90'>
          링크 하나로 내 책장을 통째로 공유하세요
        </p>
        <BookMarked
          aria-hidden='true'
          className='absolute -right-3 -bottom-3.5 size-24 rotate-[-8deg] text-white/15'
        />
      </Link>

      <Link
        href={isLoggedIn ? '/dashboard/taste-analysis' : '/login'}
        className='promo-violet relative overflow-hidden rounded-2xl px-7 py-8 transition-transform hover:-translate-y-0.5'
      >
        <p className='text-lg font-bold leading-snug text-white'>
          완독 5권이면 취향이 보여요
        </p>
        <p className='mt-1.5 text-sm text-white/90'>
          책장을 읽고 독서 성향을 알려 드립니다
        </p>
        <Sparkles
          aria-hidden='true'
          className='absolute -right-3 -bottom-3.5 size-24 rotate-[8deg] text-white/15'
        />
      </Link>
    </div>
  );
};

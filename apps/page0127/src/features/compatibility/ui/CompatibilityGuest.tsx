import Link from 'next/link';

import { Card, CardContent, PageContainer } from '@repo/ui';
import { BookCopy } from 'lucide-react';

import { CtaLink } from '@/shared/lib/analytics/CtaLink';

type CompatibilityGuestProps = {
  /** 케미를 볼 상대(이 서재의 주인) 이름 */
  targetName: string;
  username: string;
};

/**
 * 로그인 전 케미 안내 (2026-11-27, HJ "로그인 전 안내 화면 두기")
 *
 * 케미는 "나"와 상대의 비교라 로그인해야 볼 수 있다. 예전에는 비로그인을 곧장
 * /login 으로 보냈는데, 카톡·슬랙의 미리보기 봇도 비로그인이라 **로그인 화면의 미리보기
 * (= 홈 문구·홈 그림)** 가 나갔다. 이 화면을 두면 페이지가 200 으로 서서 미리보기가
 * "OO님과 나의 독서 케미" + 그 사람 책장 그림이 되고, 사람에게도 왜 로그인하는지 먼저 말해 준다.
 *
 * 서버 컴포넌트 — 클라이언트 경계는 GA 를 세는 CtaLink 하나다.
 */
export const CompatibilityGuest = ({
  targetName,
  username,
}: CompatibilityGuestProps) => {
  const path = `/${username}/compatibility`;

  return (
    <PageContainer>
      <Card className='mx-auto max-w-xl'>
        <CardContent className='py-12 text-center'>
          <BookCopy className='mx-auto mb-4 h-9 w-9 text-text-subtle' />
          <h1 className='mb-2 heading-2'>{targetName}님과 나의 독서 케미</h1>
          <p className='mb-8 text-sm break-keep text-text-body'>
            두 사람의 책장을 나란히 놓고, 겹치는 관심사와 서로 다른 결을 찾아
            드려요. 내 책장과 비교하려면 로그인이 필요해요.
          </p>

          <div className='flex flex-col items-center gap-3'>
            <CtaLink
              location='compatibility_guest_login'
              href={`/login?redirect=${encodeURIComponent(path)}`}
              className='inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90'
            >
              로그인하고 케미 보기
            </CtaLink>
            <Link
              href={`/${username}`}
              className='text-sm text-text-subtle underline-offset-4 hover:underline'
            >
              {targetName}님 책장 먼저 구경하기
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

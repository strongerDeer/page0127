import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ChevronLeft } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';
import { CHEER_YEAR, toCheerLine } from '@/entities/year-cheer';
import { getYearCheer } from '@/entities/year-cheer/server';

import { CheerScene } from '@/features/year-cheer';
import { getCheerBookCount } from '@/features/year-cheer/server';

import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ username: string }>;
};

/**
 * 링크 미리보기 제목 — 친구가 카톡으로 받았을 때 보인다.
 * 검색에는 올리지 않는다(사람마다 하나씩 생기는 얇은 페이지).
 */
export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  const name = profile ? toDisplayName(profile) : '';
  const title = profile
    ? `${name}님에게 온 ${CHEER_YEAR} 응원 | page0127.`
    : `${CHEER_YEAR} 연말 응원 | page0127.`;
  return {
    title,
    description: `${CHEER_YEAR}년을 보낸 ${name}님에게 도착한 응원 문장 선물이에요.`,
    robots: { index: false, follow: false },
  };
};

/**
 * 연말 응원 카드 (Server Component) — /아이디/cheer
 *
 * 한 주소를 주인과 친구가 같이 쓴다(HJ 2026-11-27, 3번 B "내 카드 그대로"):
 *  - 주인: 리본을 풀어 문장을 받는다(처음 한 번 저장) → 인스타 스토리 공유 · 친구에게 보내기
 *  - 친구(비회원 포함): 주인이 받은 카드를 그대로 본다 → 나도 서재 만들기 / 내 응원 받으러 가기
 *
 * 문장·권수는 둘 다 공개 범위로 읽는다(getYearCheer·getCheerBookCount 는 anon) —
 * 주인 화면과 친구 화면, 스토리 이미지가 같은 카드를 그리게 하려고.
 */
const CheerPage = async ({ params }: PageProps) => {
  const { username } = await params;

  const [profile, user] = await Promise.all([
    getPublicProfileByUsername(username),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const isOwner = user?.id === profile.id;

  const [cheer, books, viewerUsername] = await Promise.all([
    getYearCheer(profile.id, CHEER_YEAR),
    getCheerBookCount(profile.id, CHEER_YEAR),
    // 친구가 로그인해 있으면 "내 응원 받으러 가기"를 내 주소로 보낸다
    user && !isOwner
      ? createClient().then(async (supabase) => {
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle<{ username: string | null }>();
          return data?.username ?? null;
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className='mx-auto flex w-full max-w-[460px] flex-col gap-4 px-4 pb-16 pt-4'>
      <Link
        href={`/${username}`}
        className='inline-flex items-center gap-1 self-start text-sm text-text-subtle hover:text-text-strong'
      >
        <ChevronLeft aria-hidden='true' className='size-4' />
        {isOwner ? '내 서재로' : `${toDisplayName(profile)}님 서재 구경하기`}
      </Link>
      <CheerScene
        name={toDisplayName(profile)}
        username={username}
        isOwner={isOwner}
        viewerUsername={viewerUsername}
        firstLine={toCheerLine(books)}
        initialSentence={cheer?.sentence ?? null}
      />
    </div>
  );
};

export default CheerPage;

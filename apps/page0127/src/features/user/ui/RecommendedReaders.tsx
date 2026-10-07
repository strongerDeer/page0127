import { Avatar, AvatarFallback, AvatarImage, BookCover } from '@repo/ui';

import {
  nameInitials,
  toDisplayName,
} from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import type { RecommendedReaderCard } from '../api/getRecommendedReaders';

type RecommendedReadersProps = {
  readers: RecommendedReaderCard[];
};

/**
 * /search 첫 화면 — 검색어를 몰라도 만날 수 있는 리더 카드.
 *
 * 학습 포인트:
 * - 서버 컴포넌트다. 클라이언트 컴포넌트(UserSearch)에 **props 로 JSX 를 넘기면**
 *   서버에서 그린 결과가 그대로 끼워진다 — 이 목록 때문에 JS 가 늘지 않는다.
 * - 카드 전체가 프로필 링크 하나다. 링크 이름은 리더 이름이 되도록 표지는 장식 처리.
 */
export const RecommendedReaders = ({ readers }: RecommendedReadersProps) => (
  <section aria-labelledby='recommended-readers-title' className='space-y-3'>
    <h2
      id='recommended-readers-title'
      className='text-sm font-medium text-text-subtle'
    >
      최근 기록한 리더
    </h2>
    <ul className='grid gap-3 sm:grid-cols-2'>
      {readers.map((reader) => {
        const name = toDisplayName(reader);
        return (
          <li key={reader.userId}>
            <ProfileLink
              username={reader.username}
              className='flex h-full flex-col gap-3 rounded-xl border border-line p-4 transition-colors hover:bg-sunken'
            >
              <span className='flex items-center gap-3'>
                <Avatar className='size-10'>
                  <AvatarImage src={reader.photoUrl ?? undefined} alt='' />
                  <AvatarFallback className='bg-primary/15 text-sm text-primary'>
                    {nameInitials(name, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate font-medium text-text-strong'>
                    {name}
                  </span>
                  {reader.featured && (
                    <span className='text-xs font-medium text-primary'>
                      page0127. 제작자
                    </span>
                  )}
                </span>
              </span>
              {reader.covers.length > 0 && (
                <span className='flex gap-2'>
                  {reader.covers.map((cover) => (
                    <BookCover
                      key={cover.src}
                      {...cover}
                      title=''
                      size='xs'
                      decorative
                    />
                  ))}
                </span>
              )}
            </ProfileLink>
          </li>
        );
      })}
    </ul>
  </section>
);

import Link from 'next/link';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  BookCover,
  Button,
} from '@repo/ui';
import { ArrowLeft } from 'lucide-react';

import {
  nameInitials,
  toDisplayName,
} from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import type { RecommendedReaderCard } from '@/features/user/api/getRecommendedReaders';
import type { ReactNode } from 'react';

import styles from './ReadingLeague.module.css';

/** 팔로우 기능은 위젯의 슬롯으로 조립한다. 추천 카드는 다른 feature를 가져오지 않는다. */
export const BattleReaderDiscovery = ({
  readers,
  onBack,
  renderFollow,
}: {
  readers: RecommendedReaderCard[];
  onBack: () => void;
  renderFollow: (reader: RecommendedReaderCard) => ReactNode;
}) => (
  <section
    className={`${styles.root} ${styles.card}`}
    aria-label='함께 읽을 리더'
  >
    <header className={styles.header}>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='mb-3'
        onClick={onBack}
      >
        <ArrowLeft size={16} aria-hidden='true' />
        배틀로 돌아가기
      </Button>
      <p className={styles.overline}>FIND YOUR RIVAL</p>
      <h2 className='text-lg font-semibold'>함께 읽을 리더</h2>
      <p className='mt-2 text-xs leading-relaxed text-text-subtle'>
        읽고 싶은 책이 있는 책장을 골라보세요.
      </p>
    </header>
    <ul className='divide-y divide-line-soft px-5'>
      {readers.map((reader) => {
        const name = toDisplayName(reader);
        return (
          <li key={reader.userId} className='space-y-4 py-5'>
            <ProfileLink
              username={reader.username}
              className='flex items-center gap-3'
            >
              <Avatar className='size-11'>
                <AvatarImage src={reader.photoUrl ?? undefined} alt='' />
                <AvatarFallback className='bg-accent text-accent-foreground'>
                  {nameInitials(name, 2)}
                </AvatarFallback>
              </Avatar>
              <span className='font-semibold'>
                {name}
                {reader.featured && (
                  <span className='mt-1 block text-xs font-normal text-text-subtle'>
                    page0127. 제작자
                  </span>
                )}
              </span>
            </ProfileLink>
            {reader.covers.length > 0 && (
              <div>
                <p className='mb-2 text-xs text-text-subtle'>최근 공개한 책</p>
                <div className='flex gap-2'>
                  {reader.covers.map((cover) => (
                    <BookCover
                      key={cover.src}
                      {...cover}
                      title=''
                      size='xs'
                      decorative
                    />
                  ))}
                </div>
              </div>
            )}
            {renderFollow(reader)}
          </li>
        );
      })}
    </ul>
    {readers.length === 0 && (
      <div className='px-5 py-8 text-sm leading-relaxed text-text-subtle'>
        아직 추천할 리더를 찾지 못했어요.
        <br />
        <Link
          href='/search'
          className='mt-3 inline-block font-medium text-primary'
        >
          직접 리더 찾아보기 ↗
        </Link>
      </div>
    )}
    <p className='border-t border-line-soft px-5 py-4 text-center text-xs leading-relaxed text-text-subtle'>
      팔로우하면 올해 공개 완독 기록으로 비교해요.
    </p>
  </section>
);

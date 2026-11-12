import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui';

import {
  nameInitials,
  toDisplayName,
} from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import type { ReaderEntry, ReaderProfile } from '../model/bookReaders';

// 처음부터 펼쳐 보여 줄 리더 수 — 나머지는 "N명 더 보기"로 접는다
const SHOWN_READERS = 5;

const STATUS_LABEL: Record<ReaderEntry['status'], string> = {
  completed: '완독',
  reading: '읽는 중',
};

type ReaderItemProps = {
  profile: ReaderProfile;
  status: ReaderEntry['status'];
};

const ReaderItem = ({ profile, status }: ReaderItemProps) => {
  const name = toDisplayName(profile);

  return (
    <li>
      {/* username 이 없으면 ProfileLink 가 링크 없이 그대로 그린다 */}
      <ProfileLink
        username={profile.username}
        className='flex items-center gap-3 rounded-lg py-1.5 transition-colors hover:bg-sunken'
      >
        <Avatar className='size-8'>
          {/* 이름이 바로 옆에 텍스트로 있으므로 사진은 장식이다 → alt 비움 */}
          <AvatarImage src={profile.photo_url ?? undefined} alt='' />
          <AvatarFallback className='bg-accent text-xs text-accent-foreground'>
            {nameInitials(name, 2)}
          </AvatarFallback>
        </Avatar>
        <span className='min-w-0 flex-1 truncate text-sm text-text-strong'>
          {name}
        </span>
        <span
          className={
            status === 'completed'
              ? 'shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary'
              : 'shrink-0 rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-text-subtle'
          }
        >
          {STATUS_LABEL[status]}
        </span>
      </ProfileLink>
    </li>
  );
};

/**
 * "이 책을 읽은 리더" — 그리기만 한다 (데이터는 api/getBookReaders).
 *
 * 책 정보 페이지는 CDN 에 캐시되므로 서버는 "몇 명"만 그리고(items 빈 배열),
 * 로그인한 브라우저가 이어진 리더 얼굴을 받아 같은 컴포넌트로 다시 그린다(BookInfoPersonal).
 */
type ReaderProfilesProps = {
  /** 얼굴로 그릴 리더 (나·팔로잉·팔로워) */
  items: ReaderEntry[];
  /** 이 책을 읽은 공개 리더 수 */
  total: number;
  isLoggedIn: boolean;
};

export const ReaderProfiles = ({
  items,
  total,
  isLoggedIn,
}: ReaderProfilesProps) => {
  if (total === 0) return null;

  const shown = items.slice(0, SHOWN_READERS);
  const folded = items.slice(SHOWN_READERS);
  // 목록에 얼굴이 없는 사람(모르는 사람 + MAX_READERS 초과분)은 숫자로만 알린다
  const others = total - items.length;
  const othersText =
    items.length > 0
      ? `외 ${others}명이 더 읽었어요`
      : `${others}명이 읽었어요`;

  return (
    <section
      aria-labelledby='book-readers-title'
      className='space-y-3 border-t pt-4'
    >
      <h2 id='book-readers-title' className='text-lg font-medium'>
        이 책을 읽은 리더 <span className='text-text-subtle'>{total}명</span>
      </h2>

      {shown.length > 0 && (
        <ul className='space-y-1'>
          {shown.map(({ profile, status }) => (
            <ReaderItem key={profile.id} profile={profile} status={status} />
          ))}
        </ul>
      )}

      {/* JS 없이 동작하는 접기 — 상태를 들이지 않는다 */}
      {folded.length > 0 && (
        <details>
          <summary className='cursor-pointer text-sm text-text-subtle hover:text-text-strong'>
            {folded.length}명 더 보기
          </summary>
          <ul className='mt-1 space-y-1'>
            {folded.map(({ profile, status }) => (
              <ReaderItem key={profile.id} profile={profile} status={status} />
            ))}
          </ul>
        </details>
      )}

      {others > 0 && (
        <p className='text-sm text-text-subtle'>
          {othersText}
          {/* 비로그인에게는 왜 이름이 없는지 한 줄로 알린다 */}
          {!isLoggedIn && ' · 로그인하면 팔로우하는 리더가 보여요'}
        </p>
      )}

      {/* 책에서 만난 리더 → 더 많은 리더로 (비로그인이면 로그인 화면을 거친다) */}
      <Link
        href='/search'
        className='inline-block text-sm text-primary hover:underline'
      >
        다른 리더 둘러보기 →
      </Link>
    </section>
  );
};

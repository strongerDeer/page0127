// FSD: widgets는 app을 import할 수 없다 (역방향)
// → @/app/api/_helpers/auth의 getSupabaseClient 대신 shared의 createClient 직접 사용
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';

import {
  nameInitials,
  toDisplayName,
} from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import {
  type BookReader,
  type BookReaderRow,
  pickBookReaders,
} from '../model/bookReaders';

type ReaderProfilesProps = {
  isbn: string;
};

// 처음부터 펼쳐 보여 줄 리더 수 — 나머지는 "N명 더 보기"로 접는다
const SHOWN_READERS = 5;
// 접힌 목록까지 합쳐 그리는 최대 인원 (그 이상은 숫자로만 알린다)
const MAX_READERS = 20;
// 재독으로 한 사람이 여러 행을 가질 수 있어, 중복 제거를 감안해 넉넉히 받는다
const FETCH_LIMIT = 60;

const STATUS_LABEL: Record<BookReader['status'], string> = {
  completed: '완독',
  reading: '읽는 중',
};

type ReaderProfile = {
  id: string;
  username: string | null;
  nickname: string | null;
  photo_url: string | null;
};

type ReaderItemProps = {
  profile: ReaderProfile;
  status: BookReader['status'];
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
          <AvatarFallback className='bg-primary/15 text-xs text-primary'>
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

export const ReaderProfiles = async ({ isbn }: ReaderProfilesProps) => {
  const supabase = await createClient();

  // books.user_id 의 외래키는 auth.users 하나뿐이고 profiles 를 참조하지 않는다.
  // → PostgREST 가 books ↔ profiles 관계를 찾지 못해 중첩 select 조인은 PGRST200 으로 실패한다.
  //   그래서 user_id 를 먼저 모으고 profiles 를 따로 조회하는 2단계 방식을 쓴다.
  const { data: readerRows, error: readerError } = await supabase
    .from('books')
    .select('user_id, status')
    .eq('isbn', isbn)
    .in('status', ['reading', 'completed'])
    // RLS 만 믿으면 로그인 사용자에게는 자기 비공개 기록까지 섞여 방문자와 목록이 달라진다.
    // "이 책을 읽은 리더"는 누가 보든 같아야 하므로 공개 기록으로 명시해 좁힌다.
    .eq('is_public', true)
    // 최근에 기록을 만진 리더가 앞에 온다 — 지금 이 책과 함께 있는 사람
    .order('updated_at', { ascending: false })
    .limit(FETCH_LIMIT);

  // 에러를 버리면 "리더 없음"과 "쿼리가 깨졌음"이 구분되지 않는다.
  // 앱이 Supabase 생성 타입 없이 클라이언트를 만들어 런타임 error 가 유일한 신호다.
  if (readerError) {
    console.warn(
      `[ReaderProfiles] 리더 조회 실패 (isbn=${isbn}): ${readerError.message}`
    );
    return null;
  }

  const { readers, total } = pickBookReaders(
    (readerRows ?? []) as BookReaderRow[],
    MAX_READERS
  );
  if (readers.length === 0) return null;

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    // email 등 다른 컬럼은 받지 않는다 — 공개 화면에 필요한 것만
    .select('id, username, nickname, photo_url')
    .in(
      'id',
      readers.map((reader) => reader.userId)
    );

  if (profilesError) {
    console.warn(
      `[ReaderProfiles] 프로필 조회 실패 (isbn=${isbn}): ${profilesError.message}`
    );
    return null;
  }

  // in() 결과 순서는 보장되지 않으므로 리더 순서대로 다시 맞춘다
  const profileById = new Map(
    ((profiles ?? []) as ReaderProfile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );
  const items = readers.flatMap((reader) => {
    const profile = profileById.get(reader.userId);
    return profile ? [{ profile, status: reader.status }] : [];
  });
  if (items.length === 0) return null;

  const shown = items.slice(0, SHOWN_READERS);
  const folded = items.slice(SHOWN_READERS);
  // MAX_READERS 를 넘는 인원은 목록에 없으므로 숫자로만 알린다
  const unlisted = total - readers.length;

  return (
    <section
      aria-labelledby='book-readers-title'
      className='space-y-3 border-t pt-4'
    >
      <h2 id='book-readers-title' className='text-lg font-medium'>
        이 책을 읽은 리더 <span className='text-text-subtle'>{total}명</span>
      </h2>

      <ul className='space-y-1'>
        {shown.map(({ profile, status }) => (
          <ReaderItem key={profile.id} profile={profile} status={status} />
        ))}
      </ul>

      {/* JS 없이 동작하는 접기 — 서버 컴포넌트에 상태를 들이지 않는다 */}
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
          {unlisted > 0 && (
            <p className='mt-2 text-xs text-text-subtle'>
              외 {unlisted}명이 더 읽었어요
            </p>
          )}
        </details>
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

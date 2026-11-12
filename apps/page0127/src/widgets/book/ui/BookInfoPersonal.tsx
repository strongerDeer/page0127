'use client';

import Link from 'next/link';

import { Button } from '@repo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

import { useCurrentUserContext } from '@/entities/user';

import { AddToLibraryButton } from './AddToLibraryButton';
import { MyBookMemo } from './MyBookMemo';
import { ReaderProfiles } from './ReaderProfiles';

import type { BookInfoMe } from '../model/bookInfoMe';
import type { GlobalBook } from '@/entities/book';

/**
 * 책 정보 페이지의 "나만의 부분" — 브라우저에서 채우는 섬(island)들.
 *
 * 페이지 본문(책·별점·완독 수·소개)은 CDN 에 캐시되고 누가 보든 같다.
 * 사람마다 다른 것만 여기서 /api/books/info/[isbn]/me 한 번으로 받아 그린다.
 * 네 섬이 같은 쿼리 키를 써서 요청은 한 번만 나간다(React Query 중복 제거).
 *
 * 로그인 여부는 CurrentUserProvider(/api/auth/me)가 이미 알고 있다.
 * - undefined: 아직 확인 중 → 자리만 잡는다
 * - null: 비로그인 → API 를 부르지 않는다
 */
const bookInfoMeKey = (isbn: string) => ['books', 'info-me', isbn] as const;

const useBookInfoMe = (isbn: string) => {
  const { currentUser } = useCurrentUserContext();
  const query = useQuery({
    queryKey: bookInfoMeKey(isbn),
    queryFn: async () => {
      const { data } = await apiClient.get<BookInfoMe | null>(
        `/books/info/${encodeURIComponent(isbn)}/me`
      );
      return data;
    },
    enabled: !!currentUser,
    staleTime: 1000 * 30,
  });
  return { currentUser, ...query };
};

/** 담기 버튼 — 로그인 확인·내 상태를 받기 전엔 같은 크기의 빈 자리만 둔다(화면이 밀리지 않게) */
export const BookInfoActions = ({ book }: { book: GlobalBook }) => {
  const queryClient = useQueryClient();
  const { currentUser, data, isPending } = useBookInfoMe(book.isbn);

  const loading = currentUser === undefined || (!!currentUser && isPending);
  if (loading) {
    return <div aria-hidden='true' className='h-10 w-60' />;
  }

  return (
    <AddToLibraryButton
      book={book}
      isLoggedIn={!!currentUser}
      isInLibrary={data?.isInLibrary ?? false}
      onAdded={() =>
        queryClient.invalidateQueries({ queryKey: bookInfoMeKey(book.isbn) })
      }
    />
  );
};

/**
 * 이 책을 읽은 리더 — 서버(캐시)는 "몇 명"만 알고, 로그인하면 이어진 리더 얼굴을 더한다.
 * 전체 수는 최근 기록 60행 기준이라 이어진 사람 수보다 작게 나올 수 있다 → 큰 쪽.
 */
export const BookInfoReaders = ({
  isbn,
  publicTotal,
}: {
  isbn: string;
  publicTotal: number;
}) => {
  const { currentUser, data } = useBookInfoMe(isbn);
  const connected = data?.readers;

  return (
    <ReaderProfiles
      items={connected?.items ?? []}
      total={Math.max(publicTotal, connected?.total ?? 0)}
      isLoggedIn={currentUser !== null}
    />
  );
};

/** 나의 기록 — 로그인 + 서재에 있을 때만 */
export const BookInfoMyMemo = ({ isbn }: { isbn: string }) => {
  const { data } = useBookInfoMe(isbn);
  if (!data?.myBook) return null;
  return <MyBookMemo myBook={data.myBook} />;
};

/** 비로그인 방문자 — 여기서 서비스를 처음 만난다 (확인 중엔 그리지 않는다) */
export const BookInfoGuestCta = () => {
  const { currentUser } = useCurrentUserContext();
  if (currentUser !== null) return null;

  return (
    <div className='flex flex-col items-center gap-3 rounded-2xl bg-sunken px-6 py-8 text-center'>
      <p className='font-medium text-text-strong'>
        이 책도 내 책장에 꽂아둘까요?
      </p>
      <p className='text-sm text-text-subtle'>
        읽은 책을 기록하면, 몰랐던 취향이 보이기 시작합니다.
      </p>
      <Link href='/login'>
        <Button className='mt-1'>내 책장 만들기</Button>
      </Link>
    </div>
  );
};

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@repo/ui';
import { PageContainer } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { bookSelect, withPersonalMemo } from '@/entities/book/api/bookMemo';
import { getBookReadings } from '@/entities/book/api/getBookReadings';
import { getPublicBookRecord } from '@/entities/book/api/getPublicBookRecord';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

import { ArchiveToggleButton } from '@/features/book/ui/ArchiveToggleButton';
import { DeleteBookButton } from '@/features/book/ui/DeleteBookButton';
import { ShareSheetButton } from '@/features/share';
import { toPendingBook } from '@/features/shelf-preview/model/toPendingBook';
import { ReadTooButton } from '@/features/shelf-preview/ui/ReadTooButton';

import { BookDetailContent } from '@/widgets/book/ui/BookDetailContent';
import { BookReadingList } from '@/widgets/book/ui/BookReadingList';

import type { Book } from '@/entities/book';
import type { Metadata } from 'next';

/** 책 스토리 이미지는 표지 한 장이라 서재보다 빨리 나온다 — 문구도 책 한 권 기준 */
const BOOK_STORY_LOADING = {
  title: '기록 이미지를 그리고 있어요',
  wait: '표지를 펼치는 중…',
  slow: '한줄평을 옮겨 적는 중이에요. 조금만 기다려 주세요.',
};

type PageProps = {
  params: Promise<{ username: string; bookId: string }>;
};

/**
 * 공유했을 때 보이는 제목·설명.
 *
 * **공개된 기록일 때만 내용을 넣는다.** 아래 본문은 소유자에게 자기 비공개 책도
 * 보여주지만(is_public 조건을 소유자에게만 빼준다), 미리보기는 링크를 받은 사람이
 * 볼 것과 같아야 한다 — 소유자가 비공개 기록 링크를 붙였을 때 한줄평이 카드로
 * 새어 나가면 그건 사용자가 의도한 공개가 아니다.
 * OG 이미지도 같은 규칙으로 같은 폴더의 opengraph-image.tsx 가 그린다.
 *
 * 없는 대상이면 여기서 notFound() 를 부른다 — 본문이 아니라. 이 세그먼트는
 * loading.tsx 를 상속해서, 본문이 도는 시점엔 이미 200 헤더가 나간 뒤다
 * (자세한 설명은 ../page.tsx 의 같은 자리에).
 */
export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { username, bookId } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const book = await getPublicBookRecord(profile.id, bookId);

  if (!book) {
    // 공개 기록이 없다고 곧장 404 로 확정하면 안 된다 — 본문은 소유자에게
    // 자기 비공개 기록을 보여주기 때문이다(아래 isOwner 분기). 그래서
    // 소유자일 때만 통과시키고, 그 밖(없는 id·남의 비공개)은 404 로 닫는다.
    // 검색 크롤러는 항상 비로그인이라 SEO 목적은 이걸로 온전히 달성된다.
    const user = await getCurrentUser();

    if (user?.id !== profile.id) {
      notFound();
    }

    return { title: '기록을 찾을 수 없습니다 | page0127.' };
  }

  const name = toDisplayName(profile);
  // 부제(' - ' 뒤)는 뗀다 — 브런치북처럼 부제가 긴 책은 제목만 세 줄이 됐다
  const bookTitle = book.title.split(' - ')[0];
  const title = `${bookTitle} — ${name}님의 기록 | page0127.`;
  const readLine = `${name}님이 읽은 ${bookTitle}${book.author ? ` (${book.author})` : ''}`;
  // 검색 결과에는 사용자가 쓴 문장이 이 기록의 가장 좋은 요약이다
  const description = book.one_line_review?.trim() || readLine;
  // 카톡 미리보기에서는 한줄평이 이미지에 크게 실리므로(opengraph-image.tsx),
  // 아래 설명까지 같은 문장을 반복하지 않는다
  const shareDescription = readLine;

  return {
    title,
    description,
    openGraph: { title, description: shareDescription, type: 'article' },
    twitter: {
      card: 'summary_large_image',
      title,
      description: shareDescription,
    },
  };
};

/**
 * 책 상세 페이지 (Server Component)
 *
 * 본인이 보면 소유자 모드(수정·삭제·보관), 남이 보면 방문자 모드(읽기 전용).
 * - 소유자: is_public 여부와 무관하게 자기 책 전부 조회
 * - 방문자: is_public=true인 책만 조회 가능 (아니면 404)
 */
const BookDetailPage = async ({ params }: PageProps) => {
  const { username, bookId } = await params;

  const supabase = await createClient();
  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(username),
    getCurrentUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwner = currentUser?.id === profile.id;

  let bookQuery = supabase
    .from('books')
    // 메모는 주인일 때만 붙인다 — 비로그인 방문자가 메모까지 조회하면 404 가 된다
    .select(bookSelect(isOwner))
    .eq('id', bookId)
    .eq('user_id', profile.id);

  if (!isOwner) {
    bookQuery = bookQuery.eq('is_public', true);
  }

  const { data: row } = await bookQuery.maybeSingle();

  if (!row) {
    notFound();
  }

  const book: Book = withPersonalMemo(row);

  // 책장은 회독을 한 권으로 합쳐 최신 회독만 링크한다 → 옛 회독으로 가는 길을
  // 여기서 되돌려 준다. 방문자에게는 공개된 회독만 보인다.
  const readings = await getBookReadings(profile.id, book.isbn, isOwner);

  // 헤더 배지와 아래 목록이 같은 번호를 말해야 한다 — 저장된 read_count 는
  // 재독을 놓친 경우 1 로 남아 있어 목록과 어긋난다
  const readCount =
    readings.find((reading) => reading.id === book.id)?.reading_number ??
    book.read_count;

  return (
    <PageContainer>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <Link href={`/${username}`}>
          <Button variant='outline'>← {username}님의 서재로</Button>
        </Link>

        <div className='flex gap-2'>
          {/* 공개된 기록만 공유한다 — 비공개 링크는 남이 열면 404 라 공유해도 소용없다.
              버튼 하나 → 시트에서 스토리 이미지(한줄평) 또는 링크 (서재 공유와 같은 시트) */}
          {book.is_public && (
            <ShareSheetButton
              path={`/${username}/${book.id}`}
              imagePath={`/${username}/${book.id}/story-image`}
              fileName={`page0127-${username}-book.png`}
              title={book.title}
              sheetTitle='기록 공유하기'
              text={book.one_line_review ?? undefined}
              loadingMessages={BOOK_STORY_LOADING}
            />
          )}

          {isOwner && (
            <>
              <ArchiveToggleButton bookId={book.id} isPublic={book.is_public} />
              <Link href={`/${username}/${book.id}/edit`}>
                <Button variant='outline'>수정</Button>
              </Link>
              <DeleteBookButton bookId={book.id} redirectTo={`/${username}`} />
            </>
          )}
        </div>
      </div>

      <BookDetailContent
        book={book}
        isOwner={isOwner}
        readCount={readCount}
        visitorAction={
          // 남의 책일 때만 — 아는 책을 만난 순간을 내 기록(또는 가입)으로 잇는다
          isOwner ? undefined : (
            <ReadTooButton
              book={toPendingBook(book)}
              isLoggedIn={!!currentUser}
            />
          )
        }
      />

      <div className='mt-6'>
        <BookReadingList
          readings={readings}
          currentBookId={book.id}
          username={username}
        />
      </div>
    </PageContainer>
  );
};

export default BookDetailPage;

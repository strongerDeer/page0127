# 내 서재 / 공개 서재 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard`와 `/books/[id]`(+`/edit`)를 없애고 `/[username]`, `/[username]/[bookId]`(+`/edit`) 하나로 합쳐, 본인이 보면 소유자 모드(캘린더·목표설정·취향분석·보관 탭·수정/삭제), 남이 보면 방문자 모드(읽기 전용)로 같은 화면이 갈리게 만든다.

**Architecture:** 기존에 이미 공유 중인 `LibraryView`/`BookDetailContent`를 그대로 두고, 그 위의 컨테이너(`PublicLibraryContent`, `/[username]/[bookId]/page.tsx`)가 `isOwnProfile`/`isOwner` 하나로 소유자 전용 블록(캘린더, 목표 다이얼로그, 취향분석, 수정/삭제/보관 버튼)을 조건부로 흡수한다. 옛 라우트는 완전히 지우지 않고 로그인한 사용자의 `/{username}`(또는 소유한 책이면 `/{username}/{bookId}`)로 리다이렉트하는 얇은 스텁만 남긴다.

**Tech Stack:** Next.js 16 (App Router, Server/Client Component), Supabase(Postgres + Auth), npm workspaces + Turborepo.

**설계 근거:** `docs/superpowers/specs/2026-07-21-library-profile-merge-design.md`

## Global Constraints

- 패키지 매니저는 **npm** — 모든 명령은 `apps/page0127` 안에서 `npm run <script>`로 실행한다 (모노레포 루트 `turbo run`도 가능하지만 이 앱만 확인할 땐 앱 디렉터리에서 직접 실행하는 게 빠르다).
- **이 프로젝트엔 자동화 테스트 프레임워크가 없다** (`apps/page0127/package.json`에 `test` 스크립트 없음, `*.test.ts(x)` 파일 0개). 그래서 각 태스크의 "테스트" 단계는 `npm run type-check` + `npm run lint` + **개발 서버에서 직접 확인하는 수동 검증**으로 대체한다. 새로 테스트 프레임워크를 들이는 건 이 작업 범위가 아니다(사용자가 요청하지 않음).
- 코드 주석은 이 저장소 관례대로 "학습 포인트"가 필요한 곳에만 한국어로 짧게 단다 — 자명한 코드에 주석 달지 않는다.
- FSD 레이어 규칙을 지킨다: `entities` → `features` → `widgets` → `app` 방향으로만 의존한다. 새 컴포넌트는 기존 형제 파일과 같은 계층에 둔다.
- 모든 `Link`/`redirect` 대상 경로는 실제로 존재하는 라우트여야 한다 — 이 플랜이 끝나면 `/dashboard`, `/books/[id]`, `/books/[id]/edit`는 **리다이렉트 스텁으로만** 남는다.

---

## Task 1: 보안 버그 수정 — `/api/books/[id]` 소유자 검증

설계 문서에서 발견한 기존 버그: `PATCH`/`DELETE`가 `user_id` 검증 없이 `id`만으로 수정·삭제한다. `GET`도 비공개 책을 소유자 아닌 사람에게 그대로 내려준다. 이후 태스크에서 추가하는 "보관하기" 버튼도 이 `PATCH`를 타므로 먼저 고친다.

**Files:**
- Modify: `apps/page0127/app/api/books/[id]/route.ts` (전체 — 62줄)

**Interfaces:**
- Consumes: `getCurrentUser()` → `{ user: User | null, error: NextResponse | null }` (`app/api/_helpers/auth.ts`), `notFoundResponse`/`errorResponse`/`successResponse` (`app/api/_helpers/response.ts`)
- Produces: 동작 변경 없음 (응답 형식 동일) — 다만 소유자가 아니면 404를 반환한다.

- [ ] **Step 1: 수정 전 동작을 재현해 버그를 확인한다**

개발 서버를 켜고(`npm run dev`, `apps/page0127`에서), 로그인한 계정으로 브라우저 devtools에서 세션 쿠키를 확인한 뒤, 본인 소유가 아닌 책 id로 아래 요청을 보낸다 (본인 소유 책 하나, 남의 책 id 하나를 각각 Supabase Studio의 `books` 테이블에서 확인해 사용):

```bash
curl -i -X PATCH http://localhost:3000/api/books/<다른-사용자의-book-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <브라우저에서 복사한 쿠키>" \
  -d '{"one_line_review":"침입 테스트"}'
```

Expected (수정 전): `200 OK`와 함께 수정된 데이터가 그대로 응답됨 — 이게 버그다.

- [ ] **Step 2: `route.ts`를 아래 내용으로 전체 교체한다**

```ts
import { NextRequest } from 'next/server';

import { createActivity } from '../../_helpers/activity';
import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import {
  errorResponse,
  notFoundResponse,
  successResponse,
} from '../../_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/books/:id
 * 특정 책 상세 조회
 *
 * 비공개 책은 소유자만 조회 가능 — 방문자에게 개인 메모 등이 새어나가지 않도록 한다.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return notFoundResponse('책');

    if (!data.is_public && data.user_id !== user?.id) {
      return notFoundResponse('책');
    }

    return successResponse(data);
  } catch {
    return errorResponse('책 조회에 실패했습니다.');
  }
}

/**
 * PATCH /api/books/:id
 * 책 정보 수정 — 본인 소유 책만 수정할 수 있다.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { data: oldBook } = await supabase
      .from('books')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('books')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return notFoundResponse('책');

    // status가 completed로 변경된 경우 활동 생성
    if (oldBook?.status !== 'completed' && body.status === 'completed') {
      await createActivity({
        supabase,
        userId: user.id,
        bookId: id,
        activityType: 'book_completed',
      });
    }

    return successResponse(data);
  } catch {
    return errorResponse('책 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/books/:id
 * 책 삭제 — 본인 소유 책만 삭제할 수 있다.
 *
 * 학습 포인트: Supabase delete()는 조건에 안 걸리는 행이 0개여도 에러를 던지지 않는다.
 * 그래서 .select()로 실제 삭제된 행을 받아 빈 배열이면 "소유자가 아니거나 없음"으로 처리한다.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('books')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) return errorResponse(error.message);
    if (!data || data.length === 0) return notFoundResponse('책');

    return successResponse({ message: '삭제되었습니다.' });
  } catch {
    return errorResponse('책 삭제에 실패했습니다.');
  }
}
```

- [ ] **Step 3: 타입 체크**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음

- [ ] **Step 4: Step 1과 같은 요청을 다시 보내 막히는지 확인한다**

Run: (Step 1의 curl 명령 재실행)
Expected: `404 Not Found`, `{"error":"책을 찾을 수 없습니다."}`

이어서 본인 소유 책 id로 같은 요청을 보내 정상 동작(200)하는지도 확인한다.

- [ ] **Step 5: Commit**

```bash
git add apps/page0127/app/api/books/\[id\]/route.ts
git commit -m "fix: /api/books/[id] PATCH·DELETE·GET에 소유자 검증 추가"
```

---

## Task 2: 첫 로그인 시 `/{username}`으로 리다이렉트

`ensureProfile`(프로필 없으면 생성 + username 자동 발급) 로직이 지금 `dashboard/page.tsx` 안에 클로저로만 있다. `/dashboard`가 사라지므로 이 로직을 재사용 가능한 함수로 빼서 auth 콜백에서 쓴다.

**Files:**
- Modify: `apps/page0127/src/entities/profile/api/getProfile.ts:100-140` (파일 끝에 `ensureProfile` 추가)
- Modify: `apps/page0127/app/auth/callback/route.ts` (전체)
- Modify: `apps/page0127/app/(auth)/layout.tsx:19-22`

**Interfaces:**
- Produces: `ensureProfile(userId: string, email: string): Promise<Profile>` — `entities/profile/api/getProfile.ts`에서 export. `Profile.username`은 이 함수 반환 시점엔 항상 문자열(생성 보장).

- [ ] **Step 1: `getProfile.ts`에 `ensureProfile` 추가**

`apps/page0127/src/entities/profile/api/getProfile.ts` 맨 위에 `Profile` 타입 import 추가:

```ts
import type { Profile } from '../types';
```

파일 맨 끝(`upsertProfile` 함수 뒤)에 추가:

```ts
/**
 * 프로필이 없으면 생성하고, username까지 보장해서 반환한다.
 *
 * 로그인 콜백 등 "프로필이 확실히 있어야 다음 단계로 갈 수 있는" 지점에서 쓴다.
 * (dashboard/page.tsx에 있던 로직을 재사용 가능한 형태로 옮겼다)
 */
export const ensureProfile = async (
  userId: string,
  email: string
): Promise<Profile> => {
  let profile = await getProfile(userId);

  if (!profile) {
    await upsertProfile(userId, email);
    profile = await getProfile(userId);
  }

  if (!profile) {
    throw new Error('프로필 생성에 실패했습니다.');
  }

  return profile;
};
```

- [ ] **Step 2: auth 콜백이 `/dashboard` 대신 `/{username}`으로 보내도록 수정**

`apps/page0127/app/auth/callback/route.ts` 전체 교체:

```ts
import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

import { ensureProfile } from '@/entities/profile/api/getProfile';

/**
 * Google OAuth 콜백 라우트
 *
 * - Supabase Google OAuth 로그인 후 리디렉션되는 엔드포인트
 * - code를 세션으로 교환하여 인증 완료
 * - 첫 로그인이면 프로필(+username)을 먼저 만들고, 본인 서재로 리디렉션
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const profile = await ensureProfile(data.user.id, data.user.email!);
      const redirectTo = next ?? `/${profile.username}`;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // 에러 발생 시 에러 페이지로 리디렉션
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
```

(`next` 쿼리 파라미터로 명시적 목적지가 오면 그걸 우선한다 — 기존 동작 유지. 기본값만 `/dashboard`에서 "프로필 조회 후 계산"으로 바뀐다.)

- [ ] **Step 3: 이미 로그인한 사용자가 `/login`에 오면 본인 서재로 보내기**

`apps/page0127/app/(auth)/layout.tsx`에서:

```ts
  // 이미 로그인한 사용자는 대시보드로 리디렉션
  if (user) {
    redirect('/dashboard');
  }
```

→

```ts
  // 이미 로그인한 사용자는 본인 서재로 리디렉션
  if (user) {
    const profile = await ensureProfile(user.id, user.email!);
    redirect(`/${profile.username}`);
  }
```

파일 상단 import에 추가:

```ts
import { ensureProfile } from '@/entities/profile/api/getProfile';
```

- [ ] **Step 4: 타입 체크**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음

- [ ] **Step 5: 수동 검증 — 신규 계정으로 로그인**

Supabase Studio에서 테스트용으로 `profiles` 테이블에 아직 없는 계정(또는 기존 계정을 임시로 하나 지워서 재현)으로 구글 로그인 → `/{생성된username}`으로 도착하는지, `profiles.username`이 채워졌는지 확인한다. 기존 로그인 계정으로도 로그인 시도해 정상적으로 본인 `/{username}`으로 가는지 확인한다.

- [ ] **Step 6: Commit**

```bash
git add apps/page0127/src/entities/profile/api/getProfile.ts \
        apps/page0127/app/auth/callback/route.ts \
        "apps/page0127/app/(auth)/layout.tsx"
git commit -m "feat: 로그인 콜백이 /dashboard 대신 본인 /{username}으로 리다이렉트"
```

---

## Task 3: 미들웨어·robots.txt에서 `/dashboard` 정리

**Files:**
- Modify: `apps/page0127/src/shared/config/supabase/middleware.ts:44-51`
- Modify: `apps/page0127/app/robots.ts:13-21`

**Interfaces:**
- Consumes: 없음 (독립적인 설정 변경)

- [ ] **Step 1: `PROTECTED_PREFIXES`에서 `/dashboard` 제거**

`middleware.ts`:

```ts
  const PROTECTED_PREFIXES = [
    '/dashboard',
    '/books',
    '/feed',
    '/search',
    '/settings',
    '/notifications',
  ];
```

→

```ts
  // '/dashboard'는 이제 로그인 사용자의 /{username}으로 리다이렉트만 하는
  // 얇은 스텁이라 보호가 필요 없다 (안 걸려도 로그인 자체는 각 실제 기능에서 확인한다).
  const PROTECTED_PREFIXES = [
    '/books',
    '/feed',
    '/search',
    '/settings',
    '/notifications',
  ];
```

- [ ] **Step 2: `robots.ts`에서 `/dashboard` 제거**

```ts
      disallow: [
        '/dashboard',
        '/books',
```

→

```ts
      disallow: [
        '/books',
```

- [ ] **Step 3: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 검증**

로그아웃 상태에서 `/dashboard`로 직접 접속 — 미들웨어가 더 이상 `/login`으로 안 보내고, (Task 9에서 만들 리다이렉트 스텁이 아직 없으므로 지금 시점엔) 기존 `/dashboard/page.tsx`가 그대로 렌더되며 내부에서 `user!.id` 접근 시 에러가 나는 게 정상이다 — 이 스텝은 미들웨어 설정만 확인하는 목적이라, Task 9 완료 후 다시 한번 전체 흐름을 검증한다(Task 14).

- [ ] **Step 5: Commit**

```bash
git add apps/page0127/src/shared/config/supabase/middleware.ts apps/page0127/app/robots.ts
git commit -m "chore: /dashboard를 protected prefix·robots disallow에서 제거"
```

---

## Task 4: 책 상세 — 소유자 액션을 `/[username]/[bookId]`로 이식

`BookDetailContent`는 이미 `isOwner` prop으로 공유되고 있다. 여기서는 그 위의 "목록으로/수정/삭제/보관" 헤더 액션을 옮기고, 소유자 검증을 명시적으로 추가한다.

**Files:**
- Create: `apps/page0127/src/features/book/ui/ArchiveToggleButton.tsx`
- Modify: `apps/page0127/src/features/book/ui/DeleteBookButton.tsx` (전체)
- Modify: `apps/page0127/app/(public)/[username]/[bookId]/page.tsx` (전체)
- Delete: `apps/page0127/app/(protected)/books/[id]/page.tsx` → 리다이렉트 스텁으로 교체

**Interfaces:**
- Consumes: `useBookCRUD()` → `{ updateBook(id, Partial<BookInput>): Promise<Book|null>, deleteBook(id): Promise<boolean>, isLoading }` (`features/book/api/useBookCRUD.ts`, 기존)
- Produces: `ArchiveToggleButton({ bookId, isPublic }: { bookId: string; isPublic: boolean })`, `DeleteBookButton({ bookId, redirectTo }: { bookId: string; redirectTo: string })`

- [ ] **Step 1: `ArchiveToggleButton` 신설**

`apps/page0127/src/features/book/ui/ArchiveToggleButton.tsx`:

```tsx
'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { useBookCRUD } from '../api/useBookCRUD';

type ArchiveToggleButtonProps = {
  bookId: string;
  isPublic: boolean;
};

/**
 * 책 하나를 공개 ↔ 보관(비공개) 전환하는 퀵 액션.
 * 수정 폼까지 안 들어가도 상세 페이지에서 바로 누를 수 있다.
 */
export const ArchiveToggleButton = ({
  bookId,
  isPublic,
}: ArchiveToggleButtonProps) => {
  const router = useRouter();
  const { updateBook, isLoading } = useBookCRUD();
  const [currentIsPublic, setCurrentIsPublic] = useState(isPublic);

  const handleToggle = async () => {
    const next = !currentIsPublic;
    const result = await updateBook(bookId, { is_public: next });

    if (result) {
      setCurrentIsPublic(next);
      toast.success(next ? '공개로 전환했어요.' : '보관함으로 옮겼어요.');
      router.refresh();
    } else {
      toast.error('전환 중 오류가 발생했습니다.');
    }
  };

  return (
    <Button variant='outline' onClick={handleToggle} disabled={isLoading}>
      {currentIsPublic ? (
        <>
          <Archive className='h-4 w-4' />
          보관하기
        </>
      ) : (
        <>
          <ArchiveRestore className='h-4 w-4' />
          보관 해제
        </>
      )}
    </Button>
  );
};
```

- [ ] **Step 2: `DeleteBookButton`이 목적지를 prop으로 받도록 수정**

`apps/page0127/src/features/book/ui/DeleteBookButton.tsx` 전체 교체:

```tsx
'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';

import { useBookCRUD } from '../api/useBookCRUD';

type DeleteBookButtonProps = {
  bookId: string;
  /** 삭제 성공 후 이동할 경로 (예: 소유자의 /{username}) */
  redirectTo: string;
};

/**
 * 도서 삭제 버튼 컴포넌트 (Client Component)
 *
 * 학습 포인트:
 * - confirm() 대신 AlertDialog — 브라우저 기본 UI 탈피
 * - AlertDialog는 내부적으로 Portal 사용 → z-index 문제 없음
 */
export const DeleteBookButton = ({
  bookId,
  redirectTo,
}: DeleteBookButtonProps) => {
  const router = useRouter();
  const { deleteBook } = useBookCRUD();
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    const success = await deleteBook(bookId);
    if (success) {
      router.push(redirectTo);
    }
  };

  return (
    <>
      <Button variant='destructive' onClick={() => setOpen(true)}>
        삭제
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>책을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 책은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
```

- [ ] **Step 3: `/[username]/[bookId]/page.tsx`에 소유자 분기 추가**

`apps/page0127/app/(public)/[username]/[bookId]/page.tsx` 전체 교체:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { ArchiveToggleButton } from '@/features/book/ui/ArchiveToggleButton';
import { DeleteBookButton } from '@/features/book/ui/DeleteBookButton';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { BookDetailContent } from '@/widgets/book/ui/BookDetailContent';

import type { Book } from '@/entities/book';

type PageProps = {
  params: Promise<{ username: string; bookId: string }>;
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
  const [
    profile,
    {
      data: { user: currentUser },
    },
  ] = await Promise.all([
    getProfileByUsername(username),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwner = currentUser?.id === profile.id;

  let bookQuery = supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', profile.id);

  if (!isOwner) {
    bookQuery = bookQuery.eq('is_public', true);
  }

  const { data: book } = await bookQuery.single<Book>();

  if (!book) {
    notFound();
  }

  return (
    <PageContainer width='content'>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <Link href={`/${username}`}>
          <Button variant='outline'>← {username}님의 서재로</Button>
        </Link>

        {isOwner && (
          <div className='flex gap-2'>
            <ArchiveToggleButton bookId={book.id} isPublic={book.is_public} />
            <Link href={`/${username}/${book.id}/edit`}>
              <Button variant='outline'>수정</Button>
            </Link>
            <DeleteBookButton bookId={book.id} redirectTo={`/${username}`} />
          </div>
        )}
      </div>

      <BookDetailContent book={book} isOwner={isOwner} />
    </PageContainer>
  );
};

export default BookDetailPage;
```

- [ ] **Step 4: 옛 `/books/[id]` 라우트를 리다이렉트 스텁으로 교체**

`apps/page0127/app/(protected)/books/[id]/page.tsx` 전체 교체:

```tsx
import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 옛 경로 호환용 리다이렉트 — 책 상세는 이제 /{username}/{bookId} 하나뿐이다.
 * 북마크·외부 링크로 들어오는 사람들을 위해 완전히 지우지 않고 여기서 보내준다.
 * (protected)/layout.tsx가 로그인을 이미 보장하므로 여기선 프로필만 조회한다.
 */
const LegacyBookDetailRedirect = async ({ params }: PageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfile(user!.id);

  if (!profile?.username) {
    redirect('/login');
  }

  redirect(`/${profile.username}/${id}`);
};

export default LegacyBookDetailRedirect;
```

- [ ] **Step 5: 타입 체크**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음 (아직 `/books/[id]/edit`을 고치지 않아 `DeleteBookButton`을 쓰는 다른 곳이 있다면 여기서 타입 에러로 드러난다 — 있으면 Task 5에서 같이 고친다)

- [ ] **Step 6: 수동 검증**

- 본인 책 상세(`/{내username}/{내bookId}`) 접속 → "보관하기/수정/삭제" 버튼이 보이는지, "보관하기" 클릭 시 라벨이 "보관 해제"로 바뀌는지 확인.
- 로그아웃 후 같은 URL 접속 → 버튼 없이 정보만 보이는지 확인 (책이 `is_public=true`일 때만 보이고, `false`면 404인지도 확인).
- 옛 `/books/{내bookId}` 접속 → `/{내username}/{내bookId}`로 리다이렉트되는지 확인.

- [ ] **Step 7: Commit**

```bash
git add apps/page0127/src/features/book/ui/ArchiveToggleButton.tsx \
        apps/page0127/src/features/book/ui/DeleteBookButton.tsx \
        "apps/page0127/app/(public)/[username]/[bookId]/page.tsx" \
        "apps/page0127/app/(protected)/books/[id]/page.tsx"
git commit -m "feat: 책 상세 소유자 액션(수정·삭제·보관)을 /{username}/{bookId}로 이식"
```

---

## Task 5: 책 수정 페이지 이전 — `/[username]/[bookId]/edit`

기존 `/books/[id]/edit`은 전부 클라이언트 컴포넌트라 소유자 검증이 없다 (로그인 여부만 확인). 서버 컴포넌트 진입점에서 소유자 검증을 먼저 하고, 기존 폼 로직은 그대로 클라이언트 컴포넌트로 옮긴다.

**Files:**
- Create: `apps/page0127/src/widgets/book/ui/BookEditPageClient.tsx` (기존 `books/[id]/edit/page.tsx`의 로직 이전)
- Create: `apps/page0127/app/(public)/[username]/[bookId]/edit/page.tsx`
- Delete: `apps/page0127/app/(protected)/books/[id]/edit/page.tsx` → 리다이렉트 스텁으로 교체

**Interfaces:**
- Produces: `BookEditPageClient({ bookId, username }: { bookId: string; username: string })`

- [ ] **Step 1: 기존 클라이언트 로직을 `BookEditPageClient`로 옮긴다**

`apps/page0127/app/(protected)/books/[id]/edit/page.tsx`의 현재 내용을 그대로 `apps/page0127/src/widgets/book/ui/BookEditPageClient.tsx`에 복사한 뒤, 아래 세 곳만 바꾼다:

1. Props를 `use(params)` 대신 직접 받기 — 컴포넌트 시그니처를 바꾼다:

```tsx
// 변경 전
const BookEditPage = ({ params }: PageProps) => {
  const { id } = use(params);
```

```tsx
// 변경 후
type BookEditPageClientProps = {
  bookId: string;
  username: string;
};

export const BookEditPageClient = ({
  bookId: id,
  username,
}: BookEditPageClientProps) => {
```

2. `use`, `PageProps` 타입, 관련 import(`use`)를 제거한다 (더 이상 안 씀). 파일 상단 `import { use, useEffect, useRef, useState } from 'react';` → `import { useEffect, useRef, useState } from 'react';`로 수정.

3. 저장 성공 후 리다이렉트 대상을 목록이 아니라 상세 페이지로 바꾼다 (기존 주석은 "상세 페이지로 리다이렉트"라고 되어 있었는데 실제 코드는 목록으로 가는 불일치가 있었다 — 주석대로 고친다):

```tsx
// 변경 전
      toast.success('도서 정보가 수정되었습니다!');
      router.push('/books'); // 도서 목록으로 이동
```

```tsx
// 변경 후
      toast.success('도서 정보가 수정되었습니다!');
      router.push(`/${username}/${id}`); // 수정한 책 상세로 이동
```

4. 파일 맨 끝의 `export default BookEditPage;`를 삭제한다 (named export만 쓴다 — 위 2번에서 이미 `export const`로 바꿨다).

- [ ] **Step 2: 서버 컴포넌트 진입점 신설**

`apps/page0127/app/(public)/[username]/[bookId]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { BookEditPageClient } from '@/widgets/book/ui/BookEditPageClient';

type PageProps = {
  params: Promise<{ username: string; bookId: string }>;
};

/**
 * 책 수정 페이지 진입점 (Server Component)
 *
 * 소유자 검증만 여기서 하고, 실제 폼 로직은 BookEditPageClient에 위임한다.
 * 소유자가 아니면 폼 자체를 렌더링하지 않고 404.
 */
const BookEditPage = async ({ params }: PageProps) => {
  const { username, bookId } = await params;

  const supabase = await createClient();
  const [
    profile,
    {
      data: { user: currentUser },
    },
  ] = await Promise.all([
    getProfileByUsername(username),
    supabase.auth.getUser(),
  ]);

  if (!profile || currentUser?.id !== profile.id) {
    notFound();
  }

  return <BookEditPageClient bookId={bookId} username={username} />;
};

export default BookEditPage;
```

- [ ] **Step 3: 옛 `/books/[id]/edit` 라우트를 리다이렉트 스텁으로 교체**

`apps/page0127/app/(protected)/books/[id]/edit/page.tsx` 전체 교체:

```tsx
import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 옛 경로 호환용 리다이렉트 — 책 수정은 이제 /{username}/{bookId}/edit 하나뿐이다.
 * (protected)/layout.tsx가 로그인을 이미 보장하므로 여기선 프로필만 조회한다.
 */
const LegacyBookEditRedirect = async ({ params }: PageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfile(user!.id);

  if (!profile?.username) {
    redirect('/login');
  }

  redirect(`/${profile.username}/${id}/edit`);
};

export default LegacyBookEditRedirect;
```

- [ ] **Step 4: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 수동 검증**

- 본인 책 상세에서 "수정" 클릭 → `/{내username}/{bookId}/edit`으로 이동, 기존 데이터가 폼에 채워지는지 확인.
- 폼 수정 후 저장 → `/{내username}/{bookId}` 상세로 돌아오는지, 값이 반영됐는지 확인.
- 다른 사람 책 id로 직접 `/{그사람username}/{bookId}/edit` URL을 쳐서 접속 → 404 확인.
- 옛 `/books/{내bookId}/edit` 접속 → 새 경로로 리다이렉트되는지 확인.

- [ ] **Step 6: Commit**

```bash
git add apps/page0127/src/widgets/book/ui/BookEditPageClient.tsx \
        "apps/page0127/app/(public)/[username]/[bookId]/edit/page.tsx" \
        "apps/page0127/app/(protected)/books/[id]/edit/page.tsx"
git commit -m "feat: 책 수정 페이지를 /{username}/{bookId}/edit로 이전 (소유자 검증 추가)"
```

---

## Task 6: `/[username]/page.tsx` — 소유자 데이터 페칭 흡수

`/dashboard/page.tsx`가 하던 병렬 페칭(캘린더는 별도 slot, 취향분석 이력·게이트, 목표)을 `isOwnProfile`일 때만 실행하도록 옮긴다.

**Files:**
- Modify: `apps/page0127/app/(public)/[username]/page.tsx` (전체)
- Modify: `apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx` (Task 8에서 이어서 수정 — 이번 태스크에서는 새 props를 받는 자리만 만든다)

**Interfaces:**
- Consumes: `getBookStats(userId, year, publicOnly?)`, `getOverallStats(userId, publicOnly?)` (기존, `entities/book/server`), `ensureProfile`은 여기선 불필요 — `getProfileByUsername`으로 이미 프로필이 있다고 가정한다 (Task 2에서 로그인 시점에 보장).
- Produces: `PublicLibraryContent`에 새로 추가되는 props — `calendarSlot?: React.ReactNode`, `analyzableBookCount: number`, `newBooksSinceLastAnalysis: number | null`, `analysisHistory: TasteAnalysisSummary[]` (전부 소유자 모드에서만 의미 있음, 방문자는 `undefined`/빈 값으로 전달).

- [ ] **Step 1: `/[username]/page.tsx` 전체 교체**

```tsx
import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { getBookStats, getOverallStats } from '@/entities/book/server';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { CalendarBlockError } from '@/widgets/dashboard/CalendarBlockError';
import { CalendarBlockSkeleton } from '@/widgets/dashboard/CalendarBlockSkeleton';
import { CalendarSection } from '@/widgets/dashboard/CalendarSection';
import { PublicLibraryContent } from '@/widgets/public-library/PublicLibraryContent';

import type { Book } from '@/entities/book';
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ year?: string }>;
};

/** 책 목록 조회 — 소유자면 전체(공개+보관), 방문자면 공개된 것만 */
const getBooks = async (userId: string, publicOnly: boolean): Promise<Book[]> => {
  const supabase = await createClient();

  let query = supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('completed_date', { ascending: false });

  if (publicOnly) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('책 목록 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};

/**
 * 서재 페이지 (Server Component)
 *
 * 본인이 보면 소유자 모드(전체 책, 캘린더, 목표, 취향분석 전체 진입, 보관 탭),
 * 남이 보면 방문자 모드(공개된 책만, 읽기 전용)로 같은 화면이 갈린다.
 */
const LibraryPage = async ({ params, searchParams }: PageProps) => {
  const { username } = await params;
  const { year } = await searchParams;

  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const isAllView = !year || year === 'all';
  const selectedYear = isAllView ? currentYear : parseInt(year!, 10);

  const [
    profile,
    {
      data: { user: currentUser },
    },
  ] = await Promise.all([
    getProfileByUsername(username),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = currentUser?.id === profile.id;

  const [allBooks, stats, overallStats, { data: latestAnalysis }] =
    await Promise.all([
      getBooks(profile.id, !isOwnProfile),
      getBookStats(profile.id, isAllView ? null : selectedYear, !isOwnProfile),
      getOverallStats(profile.id, !isOwnProfile),
      supabase
        .from('taste_analyses')
        .select('personality_type')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const bookYears = allBooks
    .map((book) =>
      book.completed_date ? new Date(book.completed_date).getFullYear() : null
    )
    .filter((y): y is number => y !== null);

  const uniqueYears = Array.from(new Set([currentYear, ...bookYears])).sort(
    (a, b) => b - a
  );

  const booksToShow = isAllView
    ? allBooks
    : allBooks.filter((book) => {
        if (!book.completed_date) return false;
        return new Date(book.completed_date).getFullYear() === selectedYear;
      });

  // 소유자 전용 데이터 — 방문자면 아예 조회하지 않는다
  let analyzableBookCount = 0;
  let newBooksSinceLastAnalysis: number | null = null;
  let analysisHistory: TasteAnalysisSummary[] = [];

  if (isOwnProfile) {
    const { count } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'completed')
      .not('rating', 'is', null);
    analyzableBookCount = count ?? 0;

    const { data: history } = await supabase
      .from('taste_analyses')
      .select('id, personality_type, created_at, analyzed_books_count')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);
    analysisHistory = history ?? [];

    const lastAnalysis = analysisHistory[0] ?? null;
    if (lastAnalysis) {
      const { count: newCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .not('rating', 'is', null)
        .gt('completed_date', lastAnalysis.created_at);
      newBooksSinceLastAnalysis = newCount ?? 0;
    }
  }

  return (
    <PublicLibraryContent
      profile={profile}
      username={username}
      isOwnProfile={isOwnProfile}
      currentUserId={currentUser?.id}
      books={booksToShow}
      stats={stats}
      overallStats={overallStats}
      availableYears={uniqueYears}
      selectedYear={selectedYear}
      isAllView={isAllView}
      currentYear={currentYear}
      personalityType={latestAnalysis?.personality_type ?? null}
      analyzableBookCount={analyzableBookCount}
      newBooksSinceLastAnalysis={newBooksSinceLastAnalysis}
      analysisHistory={analysisHistory}
      calendarSlot={
        isOwnProfile ? (
          <ErrorBoundary fallback={<CalendarBlockError />}>
            <Suspense fallback={<CalendarBlockSkeleton />}>
              <CalendarSection userId={profile.id} />
            </Suspense>
          </ErrorBoundary>
        ) : undefined
      }
    />
  );
};

export default LibraryPage;
```

(주의: `getBookStats`/`getOverallStats`의 세 번째 인자는 "공개 책만 집계할지"인 `publicOnly` — 소유자면 `false`, 방문자면 `true`이므로 `!isOwnProfile`을 넘긴다.)

- [ ] **Step 2: `PublicLibraryContent`가 새 props를 받아들이도록 타입만 우선 넓힌다**

이 단계에서는 컴파일이 되도록 props 타입만 늘리고, 실제 사용(취향분석 카드·목표 다이얼로그 등)은 Task 7~8에서 채운다. `apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx`의 `PublicLibraryContentProps`에 추가:

```ts
type PublicLibraryContentProps = {
  // ...기존 필드 유지...
  analyzableBookCount: number;
  newBooksSinceLastAnalysis: number | null;
  analysisHistory: TasteAnalysisSummary[];
  calendarSlot?: React.ReactNode;
};
```

파일 상단에 타입 import 추가:

```ts
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';
```

컴포넌트 함수 시그니처의 구조 분해에도 새 프로퍼티들을 추가해둔다(아직 안 써도 destructuring만 해두면 다음 태스크에서 바로 쓸 수 있다):

```ts
export const PublicLibraryContent = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  books,
  stats,
  overallStats,
  availableYears,
  selectedYear,
  isAllView,
  currentYear,
  personalityType,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  calendarSlot,
}: PublicLibraryContentProps) => {
```

- [ ] **Step 3: 타입 체크**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음 (새로 받은 props를 아직 안 써서 "선언했지만 사용 안 함" 경고가 날 수 있다 — lint는 다음 태스크에서 실제로 쓰게 되면 해소된다. 지금은 type-check만 통과하면 된다)

- [ ] **Step 4: Commit**

```bash
git add "apps/page0127/app/(public)/[username]/page.tsx" \
        apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx
git commit -m "feat: /{username} 서버 컴포넌트가 소유자 전용 데이터를 조건부로 페치"
```

---

## Task 7: `PublicLibraryHeader` — 취향분석 버튼·기록 카드 흡수

**Files:**
- Modify: `apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx`

**Interfaces:**
- Consumes: `TasteAnalysisHistoryCards({ items: TasteAnalysisSummary[] })` (기존, `features/taste-analysis/ui/TasteAnalysisHistoryCards.tsx`)
- Produces: `PublicLibraryHeaderProps`에 `analyzableBookCount: number`, `newBooksSinceLastAnalysis: number | null`, `analysisHistory: TasteAnalysisSummary[]` 추가. 이 셋은 `isOwnProfile === false`일 때 호출부에서 각각 `0`, `null`, `[]`로 넘어온다.

- [ ] **Step 1: import 및 props 타입 확장**

파일 상단에 추가:

```tsx
import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

import { TasteAnalysisHistoryCards } from '@/features/taste-analysis/ui/TasteAnalysisHistoryCards';

import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';
```

`PublicLibraryHeaderProps`에 추가:

```ts
type PublicLibraryHeaderProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  personalityType: string | null;
  analyzableBookCount: number;
  newBooksSinceLastAnalysis: number | null;
  analysisHistory: TasteAnalysisSummary[];
};
```

- [ ] **Step 2: 컴포넌트 내부에 취향분석 상태·핸들러 추가 (`DashboardContent`에서 그대로 옮김)**

컴포넌트 시그니처와 기존 `useState` 선언부 사이에 추가:

```tsx
export const PublicLibraryHeader = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  personalityType,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
}: PublicLibraryHeaderProps) => {
  const router = useRouter();
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  const displayName = profile.nickname || username;

  const handleAnalyzeTaste = () => {
    if (analyzableBookCount < 5) {
      toast.error(
        '취향 분석을 위해 최소 5권의 완독한 책(별점 포함)이 필요합니다.'
      );
      return;
    }

    if (newBooksSinceLastAnalysis !== null && newBooksSinceLastAnalysis < 5) {
      toast.error(
        `이전 분석 이후 새로 읽은 책이 ${newBooksSinceLastAnalysis}권이에요. 5권 이상 쌓이면 다시 분석할 수 있어요.`
      );
      return;
    }

    setIsAnalyzeDialogOpen(true);
  };

  const doAnalyzeTaste = async () => {
    setIsAnalyzing(true);

    try {
      await apiClient.post('/taste-analysis/analyze');
      toast.success('취향 분석이 완료되었습니다!');
      router.push('/dashboard/taste-analysis');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, '취향 분석 중 오류가 발생했습니다.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };
```

(`router.push('/dashboard/taste-analysis')`는 그대로 둔다 — 이 라우트는 이번 스펙 범위 밖이라 손대지 않는다.)

- [ ] **Step 3: "프로필 편집" 버튼 옆에 "취향 분석" 버튼 추가**

```tsx
          ) : (
            <Button asChild variant='outline' className='shadow-none'>
              <Link href='/settings'>프로필 편집</Link>
            </Button>
          )}
```

→

```tsx
          ) : (
            <>
              <Button onClick={handleAnalyzeTaste} disabled={isAnalyzing}>
                {isAnalyzing && <Loader2 className='h-4 w-4 animate-spin' />}
                {isAnalyzing ? '분석 중… (최대 1분)' : '취향 분석'}
              </Button>
              <Button asChild variant='outline' className='shadow-none'>
                <Link href='/settings'>프로필 편집</Link>
              </Button>
            </>
          )}
```

- [ ] **Step 4: 취향분석 기록 카드 + 다이얼로그 + 분석 중 오버레이를 헤더 하단에 추가**

`</header>` 바로 다음, `<FollowListModal` 앞에 추가:

```tsx
      </header>

      {isOwnProfile && <TasteAnalysisHistoryCards items={analysisHistory} />}

      {isOwnProfile && (
        <AlertDialog
          open={isAnalyzeDialogOpen}
          onOpenChange={setIsAnalyzeDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>AI 독서 취향 분석</AlertDialogTitle>
              <AlertDialogDescription>
                분석에 최대 1분 정도 소요될 수 있어요. 완료될 때까지 이 화면을
                유지해주세요. 시작하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doAnalyzeTaste}>
                시작
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isAnalyzing && (
        <div className='fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm'>
          <Loader2 className='h-10 w-10 animate-spin text-primary' />
          <div className='text-center'>
            <p className='text-lg font-medium'>취향을 분석하고 있어요~</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              최대 1분 정도 걸려요. 이 화면을 벗어나지 말고 잠시만
              기다려주세요.
            </p>
          </div>
        </div>
      )}
```

- [ ] **Step 5: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없음 (`PublicLibraryContent`가 아직 새 props를 안 넘겨주고 있다면 여기서 타입 에러 — Task 8에서 마저 연결한다. 지금 단계 목표는 `PublicLibraryHeader.tsx` 자체가 타입 에러 없이 컴파일되는 것이다)

- [ ] **Step 6: Commit**

```bash
git add apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx
git commit -m "feat: PublicLibraryHeader가 소유자 전용 취향분석 진입을 흡수"
```

---

## Task 8: `PublicLibraryContent` — 목표 다이얼로그·캘린더 연결 흡수

**Files:**
- Modify: `apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx` (전체)

**Interfaces:**
- Consumes: `ReadingGoalDialog({ isOpen, onClose, currentYear, currentGoal, onSuccess })` (기존), `LibraryView`의 `onSetGoal?`/`calendarSlot?` (기존, 이미 optional)

- [ ] **Step 1: 전체 교체**

```tsx
'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { PageContainer } from '@/shared/ui/PageContainer';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';

import { LibraryView } from '@/widgets/library/LibraryView';

import { PublicLibraryHeader } from './PublicLibraryHeader';

import type { Book } from '@/entities/book';
import type { BookStats, OverallStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type PublicLibraryContentProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  books: Book[];
  stats: BookStats;
  overallStats: OverallStats;
  availableYears: number[];
  selectedYear: number;
  isAllView: boolean;
  currentYear: number;
  personalityType: string | null;
  analyzableBookCount: number;
  newBooksSinceLastAnalysis: number | null;
  analysisHistory: TasteAnalysisSummary[];
  /** 소유자 모드에서만 주입되는 캘린더 슬롯 (방문자는 undefined) */
  calendarSlot?: React.ReactNode;
};

/**
 * 서재 컨텐츠 (Client Component)
 *
 * 예전엔 '공개 서재'와 '내 서재(DashboardContent)'가 따로였는데,
 * 이제 이 컴포넌트 하나가 isOwnProfile로 두 모드를 다 담당한다.
 * - 소유자: 목표 설정, 캘린더, 취향분석(PublicLibraryHeader가 담당)
 * - 방문자: 읽기 전용
 */
export const PublicLibraryContent = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  books,
  stats,
  overallStats,
  availableYears,
  selectedYear,
  isAllView,
  currentYear,
  personalityType,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  calendarSlot,
}: PublicLibraryContentProps) => {
  const router = useRouter();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  const handleGoalClose = useCallback(() => setIsGoalDialogOpen(false), []);
  const handleGoalSuccess = useCallback(() => router.refresh(), [router]);

  const readingGoal = profile.reading_goal;
  const goalTarget =
    readingGoal?.year === selectedYear
      ? readingGoal.target
      : isOwnProfile
        ? stats.yearlyGoal
        : 0;

  const handleViewChange = (value: string) => {
    router.push(`/${username}?year=${value}`);
  };

  return (
    <PageContainer width='wide' bg='sunken' className='space-y-10'>
      <PublicLibraryHeader
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
        personalityType={personalityType}
        analyzableBookCount={analyzableBookCount}
        newBooksSinceLastAnalysis={newBooksSinceLastAnalysis}
        analysisHistory={analysisHistory}
      />

      <LibraryView
        overallStats={overallStats}
        stats={stats}
        books={books}
        availableYears={availableYears}
        selectedYear={selectedYear}
        isAllView={isAllView}
        currentYear={currentYear}
        goalTarget={goalTarget}
        onViewChange={handleViewChange}
        allShelfTitle={
          isOwnProfile
            ? '내 서재 전체'
            : `${profile.nickname || username}님의 서재 전체`
        }
        username={username}
        onSetGoal={isOwnProfile ? () => setIsGoalDialogOpen(true) : undefined}
        calendarSlot={isOwnProfile ? calendarSlot : undefined}
      />

      {isOwnProfile && (
        <ReadingGoalDialog
          isOpen={isGoalDialogOpen}
          onClose={handleGoalClose}
          currentYear={currentYear}
          currentGoal={readingGoal ?? null}
          onSuccess={handleGoalSuccess}
        />
      )}
    </PageContainer>
  );
};
```

(`stats.yearlyGoal`은 `entities/book/types/stats.ts:16`에 정의돼 있고 `getBookStats`가 항상 `50`을 채워 넣는 필드다 — 그대로 쓴다.)

- [ ] **Step 2: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없음

- [ ] **Step 3: 수동 검증**

- 본인 `/{username}` 접속(아직 `/dashboard`가 살아있는 상태) → 취향분석 버튼, 목표 진행률 + 편집 아이콘, 캘린더가 보이는지 확인. 목표 설정 다이얼로그가 열리고 저장되는지 확인.
- 로그아웃 후 같은 URL → 위 소유자 전용 요소가 전부 없고 팔로우 버튼만 보이는지 확인.

- [ ] **Step 4: Commit**

```bash
git add apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx
git commit -m "feat: PublicLibraryContent가 목표 설정·캘린더 연결을 소유자 모드로 흡수"
```

---

## Task 9: `/dashboard` 삭제 → 리다이렉트, 옛 위젯 정리

**Files:**
- Modify: `apps/page0127/app/(protected)/dashboard/page.tsx` (전체 — 리다이렉트 스텁으로 교체)
- Delete: `apps/page0127/app/(protected)/dashboard/loading.tsx`
- Delete: `apps/page0127/src/widgets/dashboard/DashboardSkeleton.tsx`
- Delete: `apps/page0127/src/widgets/dashboard/DashboardContent.tsx`

**Interfaces:**
- Consumes: `getProfile` (`entities/profile/api/getProfile.ts`, 기존)

- [ ] **Step 1: `dashboard/page.tsx`를 리다이렉트 스텁으로 교체**

```tsx
import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

/**
 * 옛 경로 호환용 리다이렉트 — '내 서재'는 이제 /{username} 하나뿐이다.
 * (protected)/layout.tsx가 로그인은 이미 보장하므로 여기선 프로필만 조회한다.
 */
const LegacyDashboardRedirect = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfile(user!.id);

  if (!profile?.username) {
    redirect('/login');
  }

  redirect(`/${profile.username}`);
};

export default LegacyDashboardRedirect;
```

- [ ] **Step 2: 안 쓰는 파일 삭제**

```bash
rm apps/page0127/app/\(protected\)/dashboard/loading.tsx
rm apps/page0127/src/widgets/dashboard/DashboardSkeleton.tsx
rm apps/page0127/src/widgets/dashboard/DashboardContent.tsx
```

- [ ] **Step 3: 타입 체크 + lint (죽은 import 확인)**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없음 — 만약 `DashboardContent`를 import하는 다른 파일이 남아있으면 여기서 드러난다. 있으면 해당 import를 제거한다(이미 Task 8까지 끝났으면 없어야 정상).

- [ ] **Step 4: 수동 검증**

- 로그인 상태에서 `/dashboard` 접속 → 본인 `/{username}`으로 리다이렉트되는지 확인.
- 로그아웃 상태에서 `/dashboard` 접속 → `/login`으로 가는지 확인.
- `/dashboard/taste-analysis`는 이번 태스크와 무관하게 그대로 동작해야 한다 — 접속해서 기존처럼 보이는지 확인 (범위 밖이라 안 건드림).

- [ ] **Step 5: Commit**

```bash
git add "apps/page0127/app/(protected)/dashboard/page.tsx"
git rm "apps/page0127/app/(protected)/dashboard/loading.tsx" \
       apps/page0127/src/widgets/dashboard/DashboardSkeleton.tsx \
       apps/page0127/src/widgets/dashboard/DashboardContent.tsx
git commit -m "refactor: /dashboard를 리다이렉트 스텁으로 축소, DashboardContent 제거"
```

---

## Task 10: 네비게이션 — "내 서재"를 동적 링크로

지금 `ProfileDropdown`엔 "공개 서재"(→`/{username}`)와 "내 서재"(→`/dashboard`) **두 항목**이 있다. 이걸 하나로 합친다. `BottomTabBar`(모바일 하단 탭)의 "내 서재"도 정적 `/dashboard` 대신 로그인 사용자의 username을 쓰도록 바꾼다.

**Files:**
- Modify: `apps/page0127/src/widgets/AppShell/model/navItems.ts` (전체)
- Modify: `apps/page0127/src/widgets/AppShell/ui/BottomTabBar.tsx` (전체)
- Modify: `apps/page0127/src/widgets/AppShell/ui/AppShellLayout.tsx:38-39`
- Modify: `apps/page0127/src/features/profile/ui/ProfileDropdown.tsx`

**Interfaces:**
- Produces: `resolveNavHref(item: NavItem, username: string | null): string`, `isNavItemActive(pathname: string, item: NavItem, username: string | null): boolean` — `navItems.ts`에서 export.

- [ ] **Step 1: `navItems.ts` 전체 교체**

```ts
import { Bell, BookOpen, Newspaper, PlusCircle, Search } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// 모바일 하단 탭바 메뉴 단일 소스 (데스크톱 메뉴는 Gnb의 GnbNav가 담당)
// 실제 라우팅 기준: /books·taste-analysis는 redirect 대상이라 메뉴에서 제외
export type NavItem = {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  /** '내 서재' 전용 — true면 href 대신 로그인 사용자의 /{username}으로 연결한다 */
  isMyLibrary?: boolean;
  href?: string;
};

export const navItems: NavItem[] = [
  { label: '내 서재', icon: BookOpen, primary: true, isMyLibrary: true },
  { href: '/feed', label: '피드', icon: Newspaper, primary: true },
  { href: '/books/add', label: '도서 추가', icon: PlusCircle },
  { href: '/search', label: '검색', icon: Search, primary: true },
  { href: '/notifications', label: '알림', icon: Bell, primary: true },
];

/** '내 서재'는 username이 없으면(드문 과도 상태) 링크를 만들 수 없다 — 홈으로 폴백 */
export const resolveNavHref = (
  item: NavItem,
  username: string | null
): string => {
  if (item.isMyLibrary) {
    return username ? `/${username}` : '/';
  }
  return item.href!;
};

// 활성 메뉴 판정
// - '내 서재'는 하위 경로(/{username}/{bookId} 등)까지 활성 처리하면
//   안 되므로 정확히 일치할 때만 활성으로 본다 (예전 '/dashboard' 특례와 동일한 규칙)
export const isNavItemActive = (
  pathname: string,
  item: NavItem,
  username: string | null
): boolean => {
  const href = resolveNavHref(item, username);
  if (item.isMyLibrary) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};
```

- [ ] **Step 2: `BottomTabBar`가 `username`을 받아 링크를 계산하도록 수정**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { isNavItemActive, navItems, resolveNavHref } from '../model/navItems';

type BottomTabBarProps = {
  /** 로그인 사용자의 username — '내 서재' 링크 계산에 쓴다 */
  username: string | null;
};

export const BottomTabBar = ({ username }: BottomTabBarProps) => {
  const pathname = usePathname();

  // '내 서재' 탭은 username이 아직 없는 드문 과도 상태에서는 아예 감춘다
  // (링크가 '/'로 잘못 뜨는 것보다 안 보이는 게 낫다)
  const items = navItems.filter(
    (item) => item.primary && !(item.isMyLibrary && !username)
  );

  return (
    <nav
      aria-label='하단 탭 메뉴'
      className='fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden'
    >
      {items.map((item) => {
        const href = resolveNavHref(item, username);
        const active = isNavItemActive(pathname, item, username);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon aria-hidden='true' className='size-5' />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
```

- [ ] **Step 3: `AppShellLayout`이 `username`을 넘겨주도록 수정**

```tsx
      {/* 하단 탭 메뉴는 전부 로그인 전용 라우트 → 비로그인에겐 숨긴다 */}
      {user && <BottomTabBar />}
```

→

```tsx
      {/* 하단 탭 메뉴는 전부 로그인 전용 라우트 → 비로그인에겐 숨긴다 */}
      {user && <BottomTabBar username={user.username} />}
```

- [ ] **Step 4: `ProfileDropdown`에서 "공개 서재"+"내 서재" 두 항목을 하나로 합친다**

```tsx
        {/* 공개 서재 */}
        {username && (
          <DropdownMenuItem asChild>
            <Link href={`/${username}`} className='flex cursor-pointer items-center'>
              <Home className='mr-2 h-4 w-4' />
              <span>공개 서재</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* 내 서재 */}
        <DropdownMenuItem asChild>
          <Link href='/dashboard' className='flex cursor-pointer items-center'>
            <BookOpen className='mr-2 h-4 w-4' />
            <span>내 서재</span>
          </Link>
        </DropdownMenuItem>
```

→

```tsx
        {/* 내 서재 — 공개 서재와 같은 화면이라 항목을 하나로 합쳤다 */}
        {username && (
          <DropdownMenuItem asChild>
            <Link href={`/${username}`} className='flex cursor-pointer items-center'>
              <BookOpen className='mr-2 h-4 w-4' />
              <span>내 서재</span>
            </Link>
          </DropdownMenuItem>
        )}
```

`Home` 아이콘 import가 더 이상 안 쓰이므로 파일 상단 import에서 제거한다:

```tsx
import { BookOpen, Home, LogOut, Settings } from 'lucide-react';
```

→

```tsx
import { BookOpen, LogOut, Settings } from 'lucide-react';
```

- [ ] **Step 5: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없음

- [ ] **Step 6: 수동 검증**

- 데스크톱 화면(md 이상)에서 프로필 드롭다운 열기 → "내 서재" 항목이 하나뿐이고 클릭 시 본인 `/{username}`으로 가는지 확인.
- 모바일 화면(devtools 반응형)에서 하단 탭바 "내 서재" 클릭 → 본인 `/{username}`으로 가고, 그 탭이 활성 표시되는지 확인. `/{username}/{bookId}`로 이동했을 때 "내 서재" 탭이 비활성으로 바뀌는지도 확인(정확히 일치할 때만 활성이라는 규칙).

- [ ] **Step 7: Commit**

```bash
git add apps/page0127/src/widgets/AppShell/model/navItems.ts \
        apps/page0127/src/widgets/AppShell/ui/BottomTabBar.tsx \
        apps/page0127/src/widgets/AppShell/ui/AppShellLayout.tsx \
        apps/page0127/src/features/profile/ui/ProfileDropdown.tsx
git commit -m "feat: '내 서재' 네비게이션을 동적 /{username} 링크로 통합"
```

---

## Task 11: 취향분석 결과 페이지 — "내 서재로" 링크 정리

`TasteAnalysisResult`의 "내 서재로" 버튼이 `/dashboard`로 가고 있다. 이제 존재하는 리다이렉트 스텁을 거쳐도 동작은 하지만, 한 번에 보내는 게 낫다.

**Files:**
- Modify: `apps/page0127/src/features/taste-analysis/ui/TasteAnalysisResult.tsx:38-54`
- Modify: `apps/page0127/app/(protected)/dashboard/taste-analysis/page.tsx`

**Interfaces:**
- Produces: `TasteAnalysisResultProps`에 `username: string` 추가.

- [ ] **Step 1: `TasteAnalysisResult`가 `username`을 받아 링크에 쓰도록 수정**

```tsx
type TasteAnalysisResultProps = {
  analysis: TasteAnalysisWithRecommendations;
};
```

→

```tsx
type TasteAnalysisResultProps = {
  analysis: TasteAnalysisWithRecommendations;
  username: string;
};
```

```tsx
export const TasteAnalysisResult = ({ analysis }: TasteAnalysisResultProps) => {
```

→

```tsx
export const TasteAnalysisResult = ({
  analysis,
  username,
}: TasteAnalysisResultProps) => {
```

```tsx
        <Link href='/dashboard'>
```

→

```tsx
        <Link href={`/${username}`}>
```

- [ ] **Step 2: 호출부(`dashboard/taste-analysis/page.tsx`)에서 username을 조회해 전달**

```tsx
import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { TasteAnalysisResult } from '@/features/taste-analysis/ui/TasteAnalysisResult';
```

→

```tsx
import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';
import { TasteAnalysisResult } from '@/features/taste-analysis/ui/TasteAnalysisResult';
```

```tsx
  if (!user) {
    redirect('/login');
  }

  // 최신 분석 결과 조회
```

→

```tsx
  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile(user.id);
  if (!profile?.username) {
    redirect('/login');
  }

  // 최신 분석 결과 조회
```

```tsx
  if (analysisError || !analysis) {
    redirect('/dashboard');
  }
```

→

```tsx
  if (analysisError || !analysis) {
    redirect(`/${profile.username}`);
  }
```

```tsx
  return <TasteAnalysisResult analysis={analysisWithRecommendations} />;
```

→

```tsx
  return (
    <TasteAnalysisResult
      analysis={analysisWithRecommendations}
      username={profile.username}
    />
  );
```

- [ ] **Step 3: 타입 체크**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음

- [ ] **Step 4: 수동 검증**

`/dashboard/taste-analysis` 접속(분석 이력 있는 계정으로) → "내 서재로" 버튼이 `/{내username}`으로 바로 가는지 확인.

- [ ] **Step 5: Commit**

```bash
git add apps/page0127/src/features/taste-analysis/ui/TasteAnalysisResult.tsx \
        "apps/page0127/app/(protected)/dashboard/taste-analysis/page.tsx"
git commit -m "chore: 취향분석 결과 페이지의 '내 서재로' 링크를 /{username}으로 직결"
```

---

## Task 12: '보관' 그리드 — 소유자 전용 토글

방식은 브레인스토밍에서 확정한 "별도 탭"(인스타 보관함形) — 평소 그리드엔 공개된 책만, 토글을 눌러야 보관된 책이 보인다. `ViewTabs`(전체/연도 — 시간 축)와는 축이 달라서 별도 토글 버튼으로 구현한다(같은 탭 줄에 억지로 끼워 넣으면 `ViewTabs`의 연도 파싱 로직과 충돌한다).

**Files:**
- Modify: `apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx`

**Interfaces:**
- Consumes: `PublicBookShelf({ books, bookHref?, username?, compact? })` (기존, `widgets/book/ui/PublicBookShelf.tsx`)

- [ ] **Step 1: import 추가**

Task 8에서 만든 파일 맨 위 import 블록에서:

```tsx
import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { PageContainer } from '@/shared/ui/PageContainer';
```

→

```tsx
import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Archive, Library } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';
```

그리고 `import { PublicLibraryHeader } from './PublicLibraryHeader';` 바로 위(같은 widgets import 그룹)에 한 줄 추가:

```tsx
import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';
```

- [ ] **Step 2: 보관된 책 분리 + 토글 상태 추가**

`goalTarget` 계산 아래에 추가:

```tsx
  const [showArchived, setShowArchived] = useState(false);

  const archivedBooks = useMemo(
    () => books.filter((book) => !book.is_public),
    [books]
  );

  const visibleBooks = useMemo(
    () => books.filter((book) => book.is_public),
    [books]
  );
```

`LibraryView`에 넘기던 `books={books}`를 `books={isOwnProfile ? visibleBooks : books}`로 바꾼다(방문자는 애초에 공개된 책만 내려받으므로 그대로 둬도 되지만, 명시적으로 통일한다):

```tsx
      <LibraryView
        overallStats={overallStats}
        stats={stats}
        books={isOwnProfile ? visibleBooks : books}
```

- [ ] **Step 3: 소유자에게만 "책장 ↔ 보관" 토글 버튼과 보관 그리드 노출**

`<LibraryView ... />` 다음, `{isOwnProfile && <ReadingGoalDialog ...>}` 앞에 추가:

```tsx
      {isOwnProfile && archivedBooks.length > 0 && (
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Button
              variant={showArchived ? 'outline' : 'secondary'}
              size='sm'
              onClick={() => setShowArchived(false)}
            >
              <Library className='h-4 w-4' />
              책장
            </Button>
            <Button
              variant={showArchived ? 'secondary' : 'outline'}
              size='sm'
              onClick={() => setShowArchived(true)}
            >
              <Archive className='h-4 w-4' />
              보관 {archivedBooks.length}
            </Button>
          </div>

          {showArchived && (
            <PublicBookShelf
              books={archivedBooks}
              username={username}
              bookHref={(book) => `/${username}/${book.id}`}
            />
          )}
        </div>
      )}
```

- [ ] **Step 4: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 수동 검증**

- 보관된 책이 없는 계정으로 본인 `/{username}` 접속 → 토글 버튼 자체가 안 보이는지 확인.
- 책 상세에서 "보관하기" 눌러 하나 이상 보관 상태로 만든 뒤 `/{username}`으로 돌아가기(또는 새로고침) → "보관 N" 버튼이 나타나고, 눌렀을 때 그 책이 그리드에 뜨는지, "책장"을 다시 누르면 사라지는지 확인.
- 보관된 책은 기본 "전체/연도" 책장 그리드(`visibleBooks` 기준)에는 안 뜨는지 확인.
- 로그아웃 후 방문자로 같은 프로필 접속 → 토글 버튼이 아예 없는지 확인.

- [ ] **Step 6: Commit**

```bash
git add apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx
git commit -m "feat: 소유자 전용 '보관' 토글 추가 — 비공개 책은 별도 그리드로"
```

---

## Task 13: 등록 폼 — "나중에 옮길 수 있다" 안내 문구

**Files:**
- Modify: `apps/page0127/src/features/book/ui/BookRegistrationForm.tsx:439-452` 부근

**Interfaces:** 없음 (순수 카피 변경)

- [ ] **Step 1: 도움말 텍스트 추가**

`apps/page0127/src/features/book/ui/BookRegistrationForm.tsx:446-450`:

```tsx
                <p className='text-sm text-muted-foreground'>
                  {isPublic
                    ? '다른 사람들이 이 책을 볼 수 있습니다.'
                    : '나만 볼 수 있습니다. (비공개)'}
                </p>
```

→

```tsx
                <p className='text-sm text-muted-foreground'>
                  {isPublic
                    ? '다른 사람들이 이 책을 볼 수 있습니다.'
                    : '나만 볼 수 있습니다. (비공개)'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  나중에 서재에서 보관으로 옮길 수 있어요.
                </p>
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없음

- [ ] **Step 3: 수동 검증**

책 등록 폼(완독 상태)을 열어 "공개 설정" 체크박스 아래에 새 안내 문구가 보이는지 확인.

- [ ] **Step 4: Commit**

```bash
git add apps/page0127/src/features/book/ui/BookRegistrationForm.tsx
git commit -m "docs: 공개 설정 체크박스에 '나중에 보관으로 옮길 수 있다' 안내 추가"
```

---

## Task 14: 전체 수동 검증 (End-to-End)

자동화 테스트가 없으므로 이 태스크가 사실상의 "통합 테스트"다. 개발 서버(`npm run dev`, `apps/page0127`)를 켜고 아래를 순서대로 확인한다.

- [ ] **Step 1: 최초 로그인 흐름**

시크릿 창으로 구글 로그인 → 프로필이 없는 계정이면 `/{자동생성username}`으로 도착하는지 확인.

- [ ] **Step 2: 소유자 모드 전체 확인**

로그인 상태에서 본인 `/{username}` 접속:
- 헤더에 취향분석 버튼, 프로필 편집, URL 복사 버튼이 보인다
- 목표 진행률 옆 편집(연필) 아이콘으로 목표 설정 다이얼로그가 열리고 저장된다
- 캘린더 히트맵이 보인다
- 보관된 책이 있으면 "보관 N" 토글이 동작한다
- 책 하나를 눌러 상세로 들어가면 보관하기/수정/삭제 버튼이 보인다

- [ ] **Step 3: 방문자 모드 전체 확인**

로그아웃(또는 다른 브라우저 프로필)으로 같은 `/{username}` 접속:
- 캘린더·목표편집·보관토글·취향분석버튼이 전부 없다
- 팔로우 버튼과 독서 궁합 버튼만 보인다
- 책 상세에 수정/삭제/보관하기 버튼이 없다
- 보관된 책의 상세 URL을 직접 쳐서 접속하면 404가 뜬다

- [ ] **Step 4: 옛 경로 호환**

로그인 상태에서 `/dashboard`, `/books/{내bookId}`, `/books/{내bookId}/edit` 각각 접속 → 전부 새 경로로 리다이렉트되는지 확인.

- [ ] **Step 5: 네비게이션**

데스크톱 프로필 드롭다운과 모바일 하단 탭바에서 "내 서재" 클릭 시 본인 `/{username}`으로 이동하는지, 활성 표시가 맞는지 확인.

- [ ] **Step 6: 보안 회귀 확인**

Task 1에서 썼던 curl 명령으로 다른 사용자의 책을 PATCH/DELETE 시도 → 여전히 404로 막히는지 재확인.

- [ ] **Step 7: 빌드 확인**

Run: `cd apps/page0127 && npm run build`
Expected: 빌드 성공 (타입 에러·명백한 런타임 에러 없음)

- [ ] **Step 8: 최종 커밋 없음 — 이 태스크는 검증 전용**

문제를 발견하면 해당 태스크로 돌아가 고치고, 그 태스크 번호로 새 커밋을 추가한다(이 태스크 자체는 커밋할 코드 변경이 없다).

# Day 28 — children / 컴포넌트 합성

## 오늘 읽을 코드

- [BookCard.tsx](../apps/page0127/src/features/book/ui/BookCard.tsx) — 현재 단일 컴포넌트 구조

---

## 핵심 개념

### children prop

JSX를 값처럼 넘기는 것. React에서 가장 기본적인 합성 방법이다.

```tsx
// children을 받는 컴포넌트
type CardProps = { children: React.ReactNode };

const Card = ({ children }: CardProps) => (
  <div className='card'>{children}</div>
);

// 사용 — 안에 무엇이든 넣을 수 있음
<Card>
  <h1>제목</h1>
  <p>내용</p>
</Card>
```

### 컴포넌트 합성 패턴

큰 컴포넌트를 역할별로 쪼개고, 조합해서 쓰는 방식.

```tsx
// 분리 전 — 하나의 컴포넌트가 모든 걸 렌더링
<BookCard book={book} onDelete={onDelete} />

// 분리 후 — 조합으로 구성
<BookCard>
  <BookCard.Cover book={book} />
  <BookCard.Info book={book} onDelete={onDelete} />
</BookCard>
```

### 정적 서브컴포넌트 패턴

`BookCard.Cover`처럼 점(`.`) 표기법으로 서브컴포넌트를 붙이는 방식.

```tsx
// BookCard에 서브컴포넌트를 프로퍼티로 연결
export const BookCard = ({ children }: { children: React.ReactNode }) => (
  <Card className='flex overflow-hidden'>{children}</Card>
);

BookCard.Cover = BookCardCover;  // 점 표기법으로 연결
BookCard.Info = BookCardInfo;
```

---

## page0127 실제 코드 사례

### 현재 BookCard — 하나가 다 함

```tsx
// BookCard.tsx — Cover + Info 모두 한 컴포넌트 안에
export const BookCard = ({ book, onDelete }: BookCardProps) => {
  return (
    <Card className='flex overflow-hidden'>
      {/* 표지 이미지 */}
      <Link href={`/books/${book.id}`} className='relative h-48 w-36 flex-shrink-0'>
        {book.cover_image ? <Image ... /> : <div>No Image</div>}
      </Link>

      {/* 책 정보 — 제목, 저자, 상태, 평점, 완독일, 한줄평, 태그, 버튼 */}
      <div className='flex flex-1 flex-col'>
        <CardHeader>...</CardHeader>
        <CardContent>...</CardContent>
      </div>
    </Card>
  );
};
```

### 합성 패턴으로 분리한다면

```tsx
// BookCardCover.tsx
type BookCardCoverProps = { book: Book };

const BookCardCover = ({ book }: BookCardCoverProps) => (
  <Link href={`/books/${book.id}`} className='relative h-48 w-36 flex-shrink-0'>
    {book.cover_image ? (
      <Image src={book.cover_image} alt={book.title} fill className='object-cover' sizes='144px' />
    ) : (
      <div className='flex h-full w-full items-center justify-center bg-gray-200 text-gray-400'>
        No Image
      </div>
    )}
  </Link>
);

// BookCardInfo.tsx
type BookCardInfoProps = { book: Book; onDelete?: (id: string) => void };

const BookCardInfo = ({ book, onDelete }: BookCardInfoProps) => {
  const statusText = { completed: '완독', reading: '읽는 중', want_to_read: '읽고 싶은 책' };
  return (
    <div className='flex flex-1 flex-col'>
      <CardHeader className='pb-3'>
        <Link href={`/books/${book.id}`}>
          <h3 className='line-clamp-2 text-base font-semibold hover:text-blue-600'>{book.title}</h3>
        </Link>
        <p className='text-sm text-gray-600'>{book.author}</p>
      </CardHeader>
      <CardContent className='flex-1 pt-0'>
        {/* 상태, 평점, 완독일, 한줄평, 태그, 버튼 ... */}
      </CardContent>
    </div>
  );
};

// BookCard.tsx — 껍데기 + 점 표기법 연결
export const BookCard = ({ children }: { children: React.ReactNode }) => (
  <Card className='flex overflow-hidden'>{children}</Card>
);

BookCard.Cover = BookCardCover;
BookCard.Info = BookCardInfo;

// 사용처 (BookList 등)
<BookCard>
  <BookCard.Cover book={book} />
  <BookCard.Info book={book} onDelete={onDelete} />
</BookCard>
```

### 합성의 진짜 장점 — 유연한 레이아웃 변경

```tsx
// Cover 없이 Info만 쓰는 뷰 (검색 결과 텍스트 목록 등)
<BookCard>
  <BookCard.Info book={book} />
</BookCard>

// Cover만 쓰는 뷰 (그리드 썸네일 등)
<BookCard>
  <BookCard.Cover book={book} />
</BookCard>
```

---

## 정리

> **규칙**: 한 컴포넌트가 여러 역할을 하면 `children`으로 쪼갠다. 조합은 재사용보다 **유연성**이 목적.

| 패턴 | 특징 |
|---|---|
| 단일 컴포넌트 | props가 많아질수록 복잡 |
| children 합성 | 내부 구조를 외부에서 결정 |
| 정적 서브컴포넌트 | 점 표기법으로 연관성 표현 |

---

## 오늘 실험

### 실험 1 — BookCard 분리 직접 해보기

`BookCardCover`, `BookCardInfo`를 각각 파일로 분리하고, `BookCard`에 점 표기법으로 연결한다.
BookList에서 `<BookCard.Cover />`, `<BookCard.Info />`로 사용해본다.

### 실험 2 — children 타입 비교

```tsx
// React.ReactNode vs ReactElement vs JSX.Element 차이 확인
type A = { children: React.ReactNode };   // null, string, number 모두 허용
type B = { children: React.ReactElement }; // JSX만 허용
type C = { children: JSX.Element };        // ReactElement와 거의 동일
```

각 타입에 `"문자열"`, `{null}`, `<div />`를 넣어보며 타입 에러 차이 확인.

---

## 이 프로젝트에서 분리하면 좋은 컴포넌트 목록

| 컴포넌트 | 현재 문제 | 분리 방향 |
|---|---|---|
| [BookCard.tsx](../apps/page0127/src/features/book/ui/BookCard.tsx) | Cover + Info 혼재 | `<BookCard.Cover />` + `<BookCard.Info />` |
| [BookListItem.tsx](../apps/page0127/src/widgets/book/ui/BookListItem.tsx) | 3D 표지 + 뱃지 + 정보가 한 파일 | `<BookListItem.Cover />` + `<BookListItem.Badge />` |
| [NotificationList.tsx](../apps/page0127/src/features/notification/ui/NotificationList.tsx) | 헤더 + 목록 + 푸터 혼재 | `<NotificationList.Header />` + `<NotificationList.Footer />` |
| [PublicLibraryHeader.tsx](../apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx) | 배경 장식 + 프로필 이미지 + 통계가 한 덩어리 | `<PublicLibraryHeader.Profile />` + `<PublicLibraryHeader.Stats />` |
| [ProfileSettingsForm.tsx](../apps/page0127/src/features/profile/ui/ProfileSettingsForm.tsx) | 사진 + 필드 + 저장 버튼이 한 컴포넌트 | `<ProfileSettingsForm.Photo />` + `<ProfileSettingsForm.Fields />` |

**우선순위**: `BookCard` → `NotificationList` → 나머지 순으로 접근하면 된다.  
`NotificationList`는 이미 Header/Body/Footer 구조가 명확해서 분리하기 쉽다.

---

## 다음 Day 예고

**Day 29 — 합성 실습**: `widgets/dashboard/` Layout을 children으로 감싸기

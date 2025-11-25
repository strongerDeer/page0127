# 도서 취향 분석 플랫폼 (Book Taste Platform)

> **프로젝트 개요:** AI 기반 개인 독서 관리 및 취향 분석 SNS 플랫폼
> **핵심 가치:** "당신의 독서 취향을 발견하고, 같은 책을 사랑하는 사람들과 연결되세요"
> **작성일:** 2025-11-25
> **참고 분석:** 밀리의 서재 벤치마크

---

## 📋 목차

1. [프로젝트 비전](#프로젝트-비전)
2. [핵심 기능 정의](#핵심-기능-정의)
3. [기능 우선순위 로드맵](#기능-우선순위-로드맵)
4. [상세 기능 명세](#상세-기능-명세)
5. [기술 스택 제안](#기술-스택-제안)
6. [UI/UX 가이드라인](#uiux-가이드라인)
7. [데이터베이스 설계](#데이터베이스-설계)
8. [API 설계](#api-설계)
9. [밀리의 서재 벤치마크 적용](#밀리의-서재-벤치마크-적용)

---

## 프로젝트 비전

### 🎯 미션
"독서를 통해 자신을 이해하고, 같은 취향의 독서가들과 연결되는 플랫폼"

### 💡 핵심 차별화 포인트

| 기존 서비스 | 본 플랫폼 |
|-----------|----------|
| 책 추천에 집중 | **취향 분석**에 집중 |
| 단순 별점/리뷰 | **AI 기반 성향 분석** |
| 일방적 추천 | **비슷한 취향의 사람 매칭** |
| 정량적 데이터 | **감성적 인사이트** |

### 🎨 브랜딩 방향
- **슬로건:** "당신의 독서 DNA를 발견하세요"
- **톤앤매너:** 따뜻하고 지적인, 친근하면서도 프로페셔널한
- **타겟:** 20-40대 독서 애호가, 자기계발에 관심 있는 MZ세대

---

## 핵심 기능 정의

### 1단계: MVP (Minimum Viable Product) 🚀

#### 필수 기능 (Launch Ready)
```
✅ 사용자 인증
   └─ Google 소셜 로그인
   └─ 프로필 설정 (닉네임, 소개, 프로필 이미지)

✅ 책 검색 및 등록
   └─ 알라딘 API 연동
   └─ 책 상세 정보 표시
   └─ 내 서재에 추가

✅ 독서 기록 관리
   └─ CRUD (생성, 읽기, 수정, 삭제)
   └─ 독서 상태: 읽고 싶은 책 / 읽는 중 / 완독
   └─ 별점 (1-5점)
   └─ 한줄평
   └─ 읽은 날짜 기록

✅ 개인 책장
   └─ 내가 읽은 책 목록
   └─ 카테고리별 필터링
   └─ 검색 기능

✅ 기본 프로필 페이지
   └─ 독서 통계 (총 권수, 올해 읽은 책 등)
   └─ 최근 읽은 책
   └─ 좋아하는 장르
```

### 2단계: 소셜 기능 강화 👥

```
✅ 팔로우/팔로워 시스템
   └─ 다른 사용자 팔로우
   └─ 팔로워 목록
   └─ 팔로잉 목록

✅ 피드 (타임라인)
   └─ 팔로우한 사람들의 독서 활동
   └─ 좋아요, 댓글
   └─ 공유하기

✅ 댓글 시스템
   └─ 독서 기록에 댓글 달기
   └─ 대댓글
   └─ 좋아요

✅ 알림 시스템
   └─ 팔로우 알림
   └─ 댓글/좋아요 알림
   └─ 실시간 알림 (WebSocket)
```

### 3단계: AI 취향 분석 🤖

```
✅ OpenAI API 기반 취향 분석
   └─ 독서 성향 분석 (예: "감성적 독서가", "실용주의자")
   └─ 선호 장르 분석
   └─ 독서 패턴 분석 (예: "주말 집중 독서형")
   └─ 개인화된 추천 멘트

✅ 취향 비교 기능
   └─ 다른 사용자와의 취향 유사도 (%)
   └─ 공통 관심사 도서
   └─ 취향 차이 시각화

✅ AI 책 추천
   └─ 내 취향 기반 추천
   └─ 이유 설명 포함
```

### 4단계: 고급 기능 & 확장 📊

```
✅ 통계 및 시각화
   └─ 연간 독서 리포트
   └─ 월별/주별 독서량 차트
   └─ 장르별 분포 파이 차트
   └─ 독서 스트릭(연속 읽기 일수)

✅ 독서 챌린지
   └─ 개인 목표 설정 (예: "올해 50권 읽기")
   └─ 커뮤니티 챌린지 참여
   └─ 달성률 진행 바
   └─ 뱃지/업적 시스템

✅ 독서 캘린더
   └─ 캘린더 뷰로 독서 기록 확인
   └─ 날짜별 읽은 책
   └─ 하루 독서 시간 기록

✅ 랭킹 시스템
   └─ 이번 달 독서왕
   └─ 장르별 전문가
   └─ 활발한 리뷰어

✅ 큐레이션
   └─ "이번 주 인기 도서"
   └─ "취향 맞는 독서가 추천"
   └─ 테마별 책 모음 (예: "겨울에 읽기 좋은 책")
```

### 5단계: 프리미엄 & 수익화 💎

```
💰 프리미엄 기능 (선택)
   └─ 무제한 AI 분석 (무료는 월 3회)
   └─ 고급 통계 리포트 (PDF 다운로드)
   └─ 광고 제거
   └─ 프로필 커스터마이징 (테마, 배지)
   └─ 우선 고객 지원

📚 제휴 수익
   └─ 알라딘/예스24 구매 링크 (제휴 마케팅)
   └─ 전자책 플랫폼 연동
```

---

## 기능 우선순위 로드맵

### Phase 1: MVP (Week 1-4) 🥇
**목표:** 기본 독서 관리 플랫폼 완성

| 기능 | 우선순위 | 예상 시간 | 의존성 |
|-----|---------|----------|--------|
| 사용자 인증 (Google) | P0 | 1주 | - |
| 책 검색 (알라딘 API) | P0 | 3일 | - |
| 독서 기록 CRUD | P0 | 1주 | 인증 |
| 개인 책장 페이지 | P0 | 4일 | 독서 기록 |
| 기본 프로필 | P1 | 3일 | 인증 |
| 책 공개여부 설정 | P1 | 2일 | 독서 기록 |

**마일스톤:** 혼자 사용 가능한 독서 다이어리

---

### Phase 2: 소셜 네트워크 (Week 5-8) 🥈
**목표:** 사용자 간 연결 및 상호작용

| 기능 | 우선순위 | 예상 시간 | 의존성 |
|-----|---------|----------|--------|
| 팔로우/팔로워 시스템 | P0 | 1주 | 프로필 |
| 피드 (타임라인) | P0 | 1주 | 팔로우 |
| 댓글 시스템 | P0 | 4일 | 독서 기록 |
| 좋아요 기능 | P1 | 2일 | - |
| 기본 알림 | P1 | 3일 | 팔로우, 댓글 |

**마일스톤:** SNS로 전환, 네트워크 효과 시작

---

### Phase 3: AI 인텔리전스 (Week 9-12) 🥉
**목표:** AI 기반 개인화 및 추천

| 기능 | 우선순위 | 예상 시간 | 의존성 |
|-----|---------|----------|--------|
| OpenAI 취향 분석 | P0 | 1주 | 독서 기록 |
| 취향 비교 | P0 | 4일 | 취향 분석 |
| AI 책 추천 | P1 | 5일 | 취향 분석 |
| 추천 알고리즘 개선 | P2 | 1주 | 추천 시스템 |

**마일스톤:** 핵심 차별화 기능 완성

---

### Phase 4: 데이터 & 게이미피케이션 (Week 13-16) 🏆
**목표:** 사용자 참여 유도 및 리텐션 강화

| 기능 | 우선순위 | 예상 시간 | 의존성 |
|-----|---------|----------|--------|
| 독서 통계 및 차트 | P0 | 1주 | 독서 기록 |
| 독서 캘린더 뷰 | P1 | 4일 | 독서 기록 |
| 독서 챌린지 | P1 | 1주 | 통계 |
| 독서량 순위 | P1 | 3일 | 통계 |
| 뱃지/업적 시스템 | P2 | 5일 | 챌린지 |

**마일스톤:** 장기 사용자 유지 메커니즘 완성

---

### Phase 5: 큐레이션 & 폴리싱 (Week 17-20) ✨
**목표:** 완성도 향상 및 런칭 준비

| 기능 | 우선순위 | 예상 시간 | 의존성 |
|-----|---------|----------|--------|
| 배너/이벤트 시스템 | P1 | 4일 | - |
| 테마별 큐레이션 | P1 | 5일 | - |
| UI/UX 개선 | P0 | 2주 | 전체 |
| 성능 최적화 | P0 | 1주 | 전체 |
| 반응형 디자인 완성 | P0 | 1주 | UI |

**마일스톤:** 베타 런칭 준비 완료

---

## 상세 기능 명세

### 1. 사용자 인증 및 프로필

#### 1.1 Google 소셜 로그인
```typescript
interface User {
  id: string;
  email: string;
  googleId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 추가 프로필 정보
interface UserProfile extends User {
  nickname: string;
  favoriteGenres: string[];
  readingGoal?: number; // 연간 목표 권수
  isPublic: boolean; // 프로필 공개 여부
  stats: {
    totalBooks: number;
    thisYearBooks: number;
    followers: number;
    following: number;
  };
}
```

**기능:**
- Google OAuth 2.0 인증
- 최초 가입 시 닉네임 설정 온보딩
- 프로필 수정 (닉네임, 소개, 사진)
- 계정 삭제 (GDPR 준수)

**UI 컴포넌트:**
- 로그인 모달
- 프로필 설정 페이지
- 온보딩 플로우 (3단계)

---

### 2. 책 검색 및 관리

#### 2.1 알라딘 API 연동
```typescript
interface Book {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  cover: string; // 썸네일 URL
  categoryName: string;
  description?: string;
  link: string; // 알라딘 상세 페이지
}

// 검색 API
async function searchBooks(query: string, page: number): Promise<Book[]>
```

**기능:**
- 실시간 검색 (디바운싱 적용)
- 검색 결과 페이지네이션
- 책 상세 정보 모달
- "내 서재에 추가" 버튼

**UI 컴포넌트:**
- 검색 바 (헤더 고정)
- 검색 결과 카드 리스트
- 책 상세 모달

---

### 3. 독서 기록 관리

#### 3.1 독서 기록 데이터 모델
```typescript
enum ReadingStatus {
  WANT_TO_READ = 'want_to_read',
  READING = 'reading',
  COMPLETED = 'completed'
}

interface ReadingRecord {
  id: string;
  userId: string;
  book: Book;
  status: ReadingStatus;
  rating?: number; // 1-5
  review?: string; // 한줄평
  startDate?: Date;
  endDate?: Date;
  isPublic: boolean; // 공개 여부
  createdAt: Date;
  updatedAt: Date;

  // 소셜 기능
  likes: number;
  comments: Comment[];
}
```

#### 3.2 CRUD 기능
```typescript
// Create
async function addBook(userId: string, book: Book, status: ReadingStatus)

// Read
async function getMyBooks(userId: string, status?: ReadingStatus)
async function getBookDetail(recordId: string)

// Update
async function updateRecord(recordId: string, updates: Partial<ReadingRecord>)
async function updateStatus(recordId: string, newStatus: ReadingStatus)

// Delete
async function deleteRecord(recordId: string)
```

**UI 컴포넌트:**
- 독서 기록 추가 모달
- 독서 상태 탭 (읽고 싶은 책 / 읽는 중 / 완독)
- 별점 입력 (별 아이콘)
- 한줄평 입력 (Textarea)
- 날짜 선택기 (캘린더)

---

### 4. 개인 책장 & 프로필

#### 4.1 책장 레이아웃
```
┌─────────────────────────────────────┐
│  내 책장                              │
├─────────────────────────────────────┤
│  [읽고 싶은 책] [읽는 중] [완독]       │
├─────────────────────────────────────┤
│  🔍 검색  | 정렬: [최신순 ▼]         │
├─────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ 책1  │ │ 책2  │ │ 책3  │         │
│  │⭐⭐⭐⭐⭐│ │⭐⭐⭐⭐ │ │⭐⭐⭐  │         │
│  └──────┘ └──────┘ └──────┘         │
└─────────────────────────────────────┘
```

**기능:**
- 상태별 탭 필터링
- 장르별 필터
- 정렬 (최신순, 별점순, 제목순)
- 검색 (내 책장 내)
- 그리드/리스트 뷰 전환

---

### 5. 팔로우 & 소셜 네트워크

#### 5.1 팔로우 시스템
```typescript
interface Follow {
  followerId: string; // 팔로우하는 사람
  followingId: string; // 팔로우 당하는 사람
  createdAt: Date;
}

async function followUser(followerId: string, followingId: string)
async function unfollowUser(followerId: string, followingId: string)
async function getFollowers(userId: string): Promise<User[]>
async function getFollowing(userId: string): Promise<User[]>
async function isFollowing(followerId: string, followingId: string): Promise<boolean>
```

#### 5.2 피드 (타임라인)
```typescript
interface FeedItem {
  id: string;
  user: User;
  type: 'new_book' | 'completed' | 'review' | 'status_update';
  record: ReadingRecord;
  createdAt: Date;

  // 인터랙션
  likes: Like[];
  comments: Comment[];
}

async function getFeed(userId: string, page: number): Promise<FeedItem[]>
```

**피드 유형:**
1. "OOO님이 새로운 책을 추가했어요"
2. "OOO님이 책을 완독했어요"
3. "OOO님이 리뷰를 남겼어요"

**UI 컴포넌트:**
- 피드 카드 (트위터 스타일)
- 무한 스크롤
- 좋아요 버튼 (하트 애니메이션)
- 댓글 입력창

---

### 6. 댓글 & 좋아요

#### 6.1 댓글 시스템
```typescript
interface Comment {
  id: string;
  recordId: string;
  userId: string;
  user: User;
  content: string;
  parentId?: string; // 대댓글용
  createdAt: Date;
  updatedAt: Date;
  likes: number;
}

async function addComment(recordId: string, userId: string, content: string)
async function getComments(recordId: string): Promise<Comment[]>
async function deleteComment(commentId: string)
```

#### 6.2 좋아요
```typescript
interface Like {
  id: string;
  userId: string;
  targetId: string; // recordId 또는 commentId
  targetType: 'record' | 'comment';
  createdAt: Date;
}

async function toggleLike(userId: string, targetId: string, targetType: string)
async function getLikeCount(targetId: string): Promise<number>
```

---

### 7. AI 취향 분석 ⭐ (핵심 기능)

#### 7.1 OpenAI API 활용
```typescript
interface TasteProfile {
  userId: string;
  generatedAt: Date;

  // AI 분석 결과
  personality: string; // "감성적 독서가", "실용주의자" 등
  description: string; // 상세 설명 (200자)
  favoriteGenres: GenreScore[];
  readingPattern: string; // "주말 집중형", "꾸준한 다독가" 등

  // 통계 기반
  totalBooks: number;
  averageRating: number;
  genreDistribution: { [genre: string]: number };

  // 추천
  recommendedBooks: Book[];
  recommendationReason: string;
}

interface GenreScore {
  genre: string;
  score: number; // 0-100
  count: number; // 읽은 권수
}
```

#### 7.2 OpenAI 프롬프트 예시
```typescript
const prompt = `
다음은 한 사용자의 독서 기록입니다:

${books.map(b => `- ${b.title} (${b.categoryName}), 평점: ${b.rating}/5, 리뷰: "${b.review}"`).join('\n')}

이 사용자의 독서 취향을 분석하여 다음 형식으로 답변해주세요:

1. 독서 성향 (한 단어 또는 짧은 문구)
2. 성향 설명 (150-200자)
3. 선호 장르 TOP 3 (각 장르에 대한 점수 0-100)
4. 독서 패턴 분석
5. 추천 도서 3권과 이유

JSON 형식으로 응답해주세요.
`;

const analysis = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }
});
```

#### 7.3 취향 비교 기능
```typescript
interface TasteComparison {
  user1: User;
  user2: User;
  similarity: number; // 0-100% 유사도

  commonBooks: Book[]; // 둘 다 읽은 책
  commonGenres: string[];
  differences: {
    genre: string;
    user1Score: number;
    user2Score: number;
  }[];

  aiComment: string; // "두 분 모두 미스터리를 좋아하시네요!"
}

async function compareTastes(userId1: string, userId2: string): Promise<TasteComparison>
```

**UI 컴포넌트:**
- 취향 프로필 카드 (인스타그램 스토리 스타일)
- 레이더 차트 (장르별 점수)
- 유사도 진행 바
- 비교 결과 모달

---

### 8. 통계 & 시각화

#### 8.1 독서 통계
```typescript
interface ReadingStats {
  userId: string;
  year: number;

  // 기본 통계
  totalBooks: number;
  pagesRead: number;
  averageRating: number;

  // 시간별
  monthlyCount: number[]; // 12개월
  weeklyCount: number[]; // 52주

  // 장르별
  genreDistribution: { [genre: string]: number };

  // 기타
  longestBook: Book;
  favoriteAuthor: string;
  readingStreak: number; // 연속 읽기 일수
}
```

#### 8.2 차트 종류
1. **막대 차트**: 월별 독서량
2. **파이 차트**: 장르 분포
3. **라인 차트**: 독서 추세
4. **히트맵**: 캘린더 뷰 (GitHub 스타일)

**라이브러리:**
- Chart.js 또는 Recharts
- react-calendar-heatmap

---

### 9. 독서 챌린지 & 게이미피케이션

#### 9.1 챌린지 시스템
```typescript
enum ChallengeType {
  BOOK_COUNT = 'book_count', // 권수 목표
  GENRE_EXPLORE = 'genre_explore', // 다양한 장르 읽기
  STREAK = 'streak', // 연속 읽기
  CUSTOM = 'custom'
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  target: number; // 목표값
  startDate: Date;
  endDate: Date;
  reward?: Badge;

  // 참여자
  participants: ChallengeParticipant[];
}

interface ChallengeParticipant {
  userId: string;
  challengeId: string;
  progress: number; // 현재 진행도
  isCompleted: boolean;
  completedAt?: Date;
}
```

**챌린지 예시:**
- "2025년 50권 읽기"
- "5가지 장르 도전"
- "30일 연속 독서"

#### 9.2 뱃지 시스템
```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: string; // "첫 책 완독", "100권 달성" 등
}

interface UserBadge {
  userId: string;
  badgeId: string;
  earnedAt: Date;
}
```

**뱃지 종류:**
- 🏅 첫 걸음: 첫 책 등록
- 📚 열정적인 독서가: 10권 완독
- 🔥 불타는 열정: 30일 연속 읽기
- 🌟 다양성의 달인: 10개 장르 읽기
- 👑 리뷰 마스터: 50개 리뷰 작성

---

### 10. 독서 캘린더

#### 10.1 캘린더 뷰
```typescript
interface CalendarDay {
  date: Date;
  books: ReadingRecord[];
  pagesRead?: number;
  hasActivity: boolean;
}

async function getCalendarData(userId: string, year: number, month: number): Promise<CalendarDay[]>
```

**UI 특징:**
- GitHub 스타일 히트맵
- 날짜 클릭 시 해당 날짜에 읽은 책 표시
- 색상 그라데이션 (독서량에 따라)
- 월간 뷰 / 연간 뷰 전환

---

### 11. 랭킹 시스템

#### 11.1 리더보드
```typescript
interface Leaderboard {
  period: 'weekly' | 'monthly' | 'yearly' | 'all_time';
  category: 'book_count' | 'review_count' | 'genre_master';
  rankings: RankingEntry[];
}

interface RankingEntry {
  rank: number;
  user: User;
  score: number;
  change: number; // 순위 변동 (+3, -2 등)
}
```

**랭킹 종류:**
1. 이번 달 독서왕 (권수)
2. 열정적인 리뷰어 (리뷰 수)
3. 장르별 전문가 (특정 장르 다독)

---

### 12. 알림 시스템

#### 12.1 알림 타입
```typescript
enum NotificationType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  MENTION = 'mention',
  CHALLENGE = 'challenge',
  BADGE = 'badge'
}

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  actor: User; // 알림을 발생시킨 사람
  targetId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}
```

**알림 예시:**
- "OOO님이 회원님을 팔로우했어요"
- "OOO님이 회원님의 리뷰를 좋아합니다"
- "OOO님이 댓글을 남겼어요: '좋은 책이네요!'"
- "새로운 뱃지를 획득했어요! 🏅"

**구현:**
- 실시간: WebSocket (Socket.io)
- 백업: 폴링 (30초 간격)
- 브라우저 푸시 알림 (선택)

---

### 13. 큐레이션 & 이벤트

#### 13.1 배너/이벤트
```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  bannerImage: string;
  startDate: Date;
  endDate: Date;
  link?: string;
}
```

**예시:**
- "신년 독서 챌린지 시작!"
- "이번 주 인기 도서 TOP 10"

#### 13.2 테마 큐레이션
```typescript
interface Curation {
  id: string;
  title: string; // "겨울에 읽기 좋은 책"
  description: string;
  books: Book[];
  curator: User; // 큐레이터 (관리자 또는 인플루언서)
  createdAt: Date;
}
```

---

## 기술 스택 제안

### Frontend
```yaml
프레임워크: Next.js 14 (App Router)
언어: TypeScript
스타일링:
  - Tailwind CSS
  - shadcn/ui (컴포넌트 라이브러리)
상태관리:
  - React Query (서버 상태)
  - Zustand (클라이언트 상태)
차트:
  - Recharts
  - react-calendar-heatmap
인증: NextAuth.js (Google Provider)
폼: React Hook Form + Zod
아이콘: Lucide React
```

### Backend
```yaml
옵션 1 (추천): Next.js API Routes + Serverless
  - Vercel 배포
  - Supabase (DB + Auth + Storage)

옵션 2: 별도 백엔드
  - Node.js + Express
  - PostgreSQL
  - Prisma ORM

AI: OpenAI API (GPT-4)
외부 API: 알라딘 도서 검색 API
실시간: Socket.io 또는 Supabase Realtime
```

### Database
```sql
-- PostgreSQL 스키마

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  display_name VARCHAR(100),
  nickname VARCHAR(50) UNIQUE,
  photo_url TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE books (
  isbn VARCHAR(13) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(200),
  publisher VARCHAR(200),
  pub_date DATE,
  cover TEXT,
  category_name VARCHAR(100),
  description TEXT
);

CREATE TABLE reading_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  isbn VARCHAR(13) REFERENCES books(isbn),
  status VARCHAR(20) CHECK (status IN ('want_to_read', 'reading', 'completed')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  start_date DATE,
  end_date DATE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID REFERENCES reading_records(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type VARCHAR(20) CHECK (target_type IN ('record', 'comment')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type)
);

CREATE TABLE taste_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  personality VARCHAR(100),
  description TEXT,
  reading_pattern VARCHAR(100),
  genre_scores JSONB, -- { "소설": 85, "자기계발": 70, ... }
  generated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(50),
  target INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenge_participants (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  rarity VARCHAR(20),
  condition TEXT
);

CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_reading_records_user_id ON reading_records(user_id);
CREATE INDEX idx_reading_records_status ON reading_records(status);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_comments_record ON comments(record_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
```

### 배포
```yaml
프론트엔드: Vercel
백엔드: Vercel Serverless Functions 또는 Railway
데이터베이스: Supabase 또는 Neon (Serverless Postgres)
파일 저장소: Supabase Storage 또는 AWS S3
CDN: Vercel Edge Network
도메인: Vercel Domains 또는 Cloudflare
```

---

## UI/UX 가이드라인

### 디자인 시스템 (밀리의 서재 벤치마크)

#### 색상 팔레트
```css
/* Primary - 브랜드 컬러 */
--primary: #FFD700; /* 골드 - 책의 가치를 상징 */
--primary-hover: #FFC700;
--primary-light: #FFF4CC;

/* Secondary */
--secondary: #2D3748; /* 다크 그레이 - 고급스러움 */
--secondary-light: #4A5568;

/* Neutral */
--background: #FFFFFF;
--surface: #F7FAFC;
--text-primary: #1A202C;
--text-secondary: #718096;
--border: #E2E8F0;

/* Semantic */
--success: #48BB78;
--warning: #ED8936;
--error: #F56565;
--info: #4299E1;

/* Accent */
--accent-purple: #9F7AEA; /* 취향 분석용 */
--accent-pink: #ED64A6; /* 소셜 기능용 */
```

#### 타이포그래피
```css
/* Headings */
--font-heading: 'Pretendard Variable', sans-serif;
--h1: 2.5rem; /* 40px */
--h2: 2rem;   /* 32px */
--h3: 1.5rem; /* 24px */
--h4: 1.25rem;/* 20px */

/* Body */
--font-body: 'Pretendard Variable', sans-serif;
--body-lg: 1.125rem; /* 18px */
--body: 1rem;        /* 16px */
--body-sm: 0.875rem; /* 14px */
--caption: 0.75rem;  /* 12px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

#### 레이아웃 원칙
1. **모바일 우선**: 320px부터 반응형
2. **최대 너비**: 1280px (콘텐츠)
3. **그리드**: 12-column grid
4. **간격**: 4px 단위 (4, 8, 12, 16, 24, 32, 48, 64)

#### 컴포넌트 스타일

##### 버튼
```tsx
// Primary Button
<button className="
  bg-primary hover:bg-primary-hover
  text-secondary font-semibold
  px-6 py-3 rounded-lg
  shadow-md hover:shadow-lg
  transition-all duration-200
  active:scale-95
">
  첫 달 무료 시작하기
</button>

// Secondary Button
<button className="
  border-2 border-secondary text-secondary
  hover:bg-secondary hover:text-white
  px-6 py-3 rounded-lg
  transition-all duration-200
">
  더 알아보기
</button>
```

##### 카드
```tsx
<div className="
  bg-white rounded-xl shadow-sm
  hover:shadow-md transition-shadow
  p-6 border border-border
">
  {/* 책 정보 */}
</div>
```

##### 입력 필드
```tsx
<input className="
  w-full px-4 py-3
  border border-border rounded-lg
  focus:border-primary focus:ring-2 focus:ring-primary-light
  transition-all
  placeholder:text-text-secondary
" />
```

### 페이지 레이아웃

#### 메인 페이지
```
┌─────────────────────────────────────────┐
│  [로고]    검색    피드   프로필   [로그인] │ ← Header
├─────────────────────────────────────────┤
│                                         │
│     📚 당신의 독서 DNA를 발견하세요         │ ← Hero
│     [첫 달 무료 시작하기]                  │
│                                         │
├─────────────────────────────────────────┤
│  이번 주 인기 도서                         │ ← 큐레이션
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐                   │
│  │  │ │  │ │  │ │  │                   │
│  └──┘ └──┘ └──┘ └──┘                   │
├─────────────────────────────────────────┤
│  독서가들의 이야기                         │ ← 피드 미리보기
│  ┌─────────────────────┐                │
│  │ @user1 님이...       │                │
│  └─────────────────────┘                │
└─────────────────────────────────────────┘
```

#### 마이 페이지
```
┌─────────────────────────────────────────┐
│  [@username]  [팔로우]                   │
│  🌟 감성적 독서가                         │ ← 취향 프로필
│  올해 42권 읽음                           │
├─────────────────────────────────────────┤
│  [내 책장] [통계] [챌린지] [뱃지]         │ ← 탭
├─────────────────────────────────────────┤
│  📊 독서 통계                             │
│  ┌─────────────────┐                    │
│  │  월별 독서량 차트  │                    │
│  └─────────────────┘                    │
├─────────────────────────────────────────┤
│  최근 읽은 책                             │
│  ┌──┐ ┌──┐ ┌──┐                        │
│  │  │ │  │ │  │                        │
│  └──┘ └──┘ └──┘                        │
└─────────────────────────────────────────┘
```

### 애니메이션 & 인터랙션

#### Micro-interactions
```tsx
// 좋아요 버튼 (하트)
const [liked, setLiked] = useState(false);

<motion.button
  whileTap={{ scale: 0.8 }}
  onClick={() => setLiked(!liked)}
>
  <motion.div
    animate={{
      scale: liked ? [1, 1.3, 1] : 1,
      rotate: liked ? [0, -10, 10, 0] : 0
    }}
    transition={{ duration: 0.3 }}
  >
    {liked ? '❤️' : '🤍'}
  </motion.div>
</motion.button>

// 별점
<div className="flex gap-1">
  {[1, 2, 3, 4, 5].map(star => (
    <motion.span
      key={star}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      className="cursor-pointer"
    >
      {star <= rating ? '⭐' : '☆'}
    </motion.span>
  ))}
</div>
```

---

## 밀리의 서재 벤치마크 적용

### 배운 점 & 적용 사항

#### 1. 명확한 가치 제안
**밀리:** "독서와 무제한 친해지리"
**적용:** "당신의 독서 DNA를 발견하세요"

#### 2. 큐레이션 전략
**밀리:** "밀리 북클럽의 선택", "밀리 오리지널"
**적용:**
- "이번 주 취향 맞는 독서가 추천"
- "AI가 선택한 당신을 위한 책"

#### 3. 커뮤니티 참여
**밀리:** "추천챌린지", "오늘의한문장"
**적용:**
- 독서 챌린지 시스템
- 피드 & 댓글로 소셜 기능 강화

#### 4. 퀵 메뉴 아이콘
**밀리:** 7개의 시각적 퀵 메뉴
**적용:**
- 홈 화면 상단에 주요 기능 아이콘 배치
- 새 책, 인기, 추천, 챌린지, 통계 등

#### 5. 시그니처 컬러
**밀리:** 노란색 (따뜻함, 친근함)
**적용:** 골드 컬러 (책의 가치, 프리미엄)

#### 6. 프리미엄 전략
**밀리:** "첫 달 무료"
**적용:**
- 기본 기능 무료
- AI 분석 월 3회 무료 → 무제한은 프리미엄

---

## API 엔드포인트 설계

### REST API 구조

```typescript
// 인증
POST   /api/auth/google
POST   /api/auth/logout
GET    /api/auth/me

// 사용자
GET    /api/users/:id
PATCH  /api/users/:id
GET    /api/users/:id/books
GET    /api/users/:id/followers
GET    /api/users/:id/following
GET    /api/users/:id/stats

// 팔로우
POST   /api/follow/:userId
DELETE /api/follow/:userId

// 책 검색
GET    /api/books/search?q=:query&page=:page
GET    /api/books/:isbn

// 독서 기록
GET    /api/records
POST   /api/records
GET    /api/records/:id
PATCH  /api/records/:id
DELETE /api/records/:id

// 피드
GET    /api/feed?page=:page

// 댓글
GET    /api/records/:id/comments
POST   /api/records/:id/comments
DELETE /api/comments/:id

// 좋아요
POST   /api/likes
DELETE /api/likes/:id

// AI 취향 분석
GET    /api/taste-profile
POST   /api/taste-profile/generate
GET    /api/taste-profile/compare/:userId

// 통계
GET    /api/stats/my
GET    /api/stats/:userId

// 챌린지
GET    /api/challenges
GET    /api/challenges/:id
POST   /api/challenges/:id/join
PATCH  /api/challenges/:id/progress

// 뱃지
GET    /api/badges
GET    /api/users/:id/badges

// 알림
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all

// 랭킹
GET    /api/rankings/:type?period=:period
```

---

## 성능 최적화 전략

### 1. 프론트엔드
```typescript
// 이미지 최적화
import Image from 'next/image';

<Image
  src={book.cover}
  alt={book.title}
  width={200}
  height={300}
  loading="lazy"
  placeholder="blur"
/>

// 코드 스플리팅
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton />,
  ssr: false
});

// 무한 스크롤 가상화
import { useVirtualizer } from '@tanstack/react-virtual';

// React Query로 캐싱
const { data } = useQuery({
  queryKey: ['books', userId],
  queryFn: () => fetchBooks(userId),
  staleTime: 5 * 60 * 1000 // 5분
});
```

### 2. 백엔드
```typescript
// 페이지네이션
GET /api/feed?page=1&limit=20

// 필드 선택
GET /api/users/:id?fields=id,name,photo

// 캐싱 (Redis)
const cachedData = await redis.get(`user:${userId}`);
if (cachedData) return JSON.parse(cachedData);

// DB 쿼리 최적화
// N+1 문제 해결
const records = await db.readingRecord.findMany({
  where: { userId },
  include: { book: true, user: true } // Eager loading
});

// 인덱스 활용
CREATE INDEX idx_records_user_status ON reading_records(user_id, status);
```

### 3. CDN & 캐싱
- 정적 파일: Vercel Edge Network
- 이미지: Cloudinary 또는 Vercel Image Optimization
- API 응답: Stale-While-Revalidate 전략

---

## 보안 & 개인정보 보호

### 1. 인증 & 권한
```typescript
// 미들웨어
async function requireAuth(req, res, next) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  req.user = session.user;
  next();
}

// 리소스 접근 제어
async function canAccessRecord(userId: string, recordId: string) {
  const record = await db.readingRecord.findUnique({
    where: { id: recordId }
  });

  if (!record) return false;
  if (record.userId === userId) return true;
  if (record.isPublic) return true;

  // 팔로워는 볼 수 있는지 체크
  const isFollowing = await db.follow.findFirst({
    where: {
      followerId: userId,
      followingId: record.userId
    }
  });

  return !!isFollowing;
}
```

### 2. 데이터 보호
- 비밀번호는 저장하지 않음 (Google OAuth만 사용)
- 이메일은 암호화 저장
- HTTPS 강제
- CORS 설정
- Rate Limiting

### 3. GDPR 준수
- 사용자 데이터 다운로드 기능
- 계정 삭제 시 모든 데이터 삭제
- 쿠키 동의 배너
- 개인정보 처리방침

---

## 테스트 전략

### 1. 단위 테스트 (Jest)
```typescript
// 예: 별점 계산 함수
describe('calculateAverageRating', () => {
  it('should return correct average', () => {
    const ratings = [5, 4, 5, 3, 4];
    expect(calculateAverageRating(ratings)).toBe(4.2);
  });

  it('should return 0 for empty array', () => {
    expect(calculateAverageRating([])).toBe(0);
  });
});
```

### 2. 통합 테스트 (Playwright)
```typescript
test('user can add a book to their shelf', async ({ page }) => {
  await page.goto('/');
  await page.click('text=로그인');

  // 책 검색
  await page.fill('[placeholder="책 검색"]', '트렌드 코리아');
  await page.click('button:has-text("검색")');

  // 첫 번째 결과 추가
  await page.click('.book-card:first-child >> text=추가');

  // 상태 선택
  await page.click('text=읽고 싶은 책');

  // 확인
  await expect(page.locator('text=책이 추가되었습니다')).toBeVisible();
});
```

### 3. E2E 테스트
- 회원가입부터 책 추가, 리뷰 작성, 팔로우까지 전체 플로우

---

## 런칭 체크리스트

### 기술적 준비
- [ ] 모든 핵심 기능 구현 완료
- [ ] 반응형 디자인 테스트 (모바일, 태블릿, 데스크톱)
- [ ] 크로스 브라우저 테스트 (Chrome, Safari, Firefox)
- [ ] 성능 테스트 (Lighthouse 90+ 점수)
- [ ] 보안 취약점 점검
- [ ] 에러 핸들링 & 로깅 설정
- [ ] 백업 시스템 구축

### 콘텐츠 준비
- [ ] 랜딩 페이지 작성
- [ ] 이용약관 & 개인정보 처리방침
- [ ] 튜토리얼/온보딩 플로우
- [ ] FAQ 페이지
- [ ] 소셜 미디어 계정 개설

### 마케팅 준비
- [ ] 베타 테스터 모집 (20-50명)
- [ ] 피드백 수집 및 개선
- [ ] 프로덕트 헌트 준비
- [ ] SNS 티저 콘텐츠 제작
- [ ] 인플루언서/북튜버 컨택

---

## 마일스톤 & 타임라인 요약

```
Week 1-4   [████████████░░░░░░░░] MVP 완성
Week 5-8   [░░░░░░░░░░░░████████░░] 소셜 기능
Week 9-12  [░░░░░░░░░░░░░░░░░░░░████] AI 기능
Week 13-16 [░░░░░░░░░░░░░░░░░░░░░░░░████] 통계 & 게임화
Week 17-20 [░░░░░░░░░░░░░░░░░░░░░░░░░░░░████] 폴리싱 & 런칭
```

**총 예상 기간:** 20주 (약 5개월)
**최소 실행 가능 제품(MVP):** 4주
**베타 런칭:** 12주
**정식 런칭:** 20주

---

## 결론

이 프로젝트는 단순한 독서 관리 앱을 넘어, **AI 기반 취향 분석**과 **소셜 네트워크**를 결합한 차별화된 플랫폼입니다.

### 🎯 성공 핵심 요소
1. **AI 취향 분석**: OpenAI를 활용한 개인화된 인사이트
2. **소셜 기능**: 같은 취향의 독서가 매칭
3. **게이미피케이션**: 챌린지, 뱃지로 지속적 참여 유도
4. **아름다운 UI**: 밀리의 서재 벤치마크한 세련된 디자인

### 📈 성장 전략
- 초기: 독서 커뮤니티 타겟팅 (SNS, 북클럽)
- 중기: 인플루언서 협업, 바이럴 마케팅
- 장기: B2B (도서관, 학교), 제휴 (출판사, 서점)

**이 기획서를 바탕으로 단계별로 개발하면 차별화된 독서 플랫폼을 만들 수 있습니다!** 🚀📚
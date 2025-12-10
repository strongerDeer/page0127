# 대시보드 UI/UX 명세서

> **"내 서재"** - 통계와 책 목록을 한 페이지에서
>
> 작성일: 2025-12-10
> 업데이트: 2025-12-10

---

## 📖 개요

### 개념

**"통계를 보러 가는 게 아니라, 내 책장을 보면서 자연스럽게 통계를 확인"**

- 기존: 대시보드(통계) ↔ 내 서재(목록) 분리
- 개선: **대시보드 = 내 서재** (단일 페이지 통합)

### 핵심 가치

1. **한눈에 파악**: 전체 독서 히스토리 + 연도별 통계 + 책 목록
2. **직관적 필터링**: 차트 클릭 → 즉시 책 목록 반영
3. **동기 부여**: 성취감 + 인사이트 + 게이미피케이션

---

## 🎨 전체 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ Header (공통)                                     [+ 책 추가]    │
└─────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════╗
║ 📖 전체 독서 통계 (All Time Stats) - 고정 영역                  ║
╚═════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣ 독서 여정 카드 (4개 지표)                                   │
│    - 총 읽은 책 + 10점 만점 책                                   │
│    - 총 읽은 쪽수 + 하루 평균                                    │
│    - 독서 기간 + 예상 독서 시간                                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│ 2️⃣ 카테고리별 분포       │ 3️⃣ 최근 5년 독서량                   │
│   (Pie Chart)            │   (Bar Chart)                        │
└──────────────────────────┴──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4️⃣ 평점 분포 (Horizontal Bar) + AI 인사이트                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 5️⃣ 독서 뱃지 (선택 사항)                                        │
└─────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════╗
║ 📅 연도별 통계 (선택된 연도 기준) - 동적 영역                   ║
╚═════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ 6️⃣ 연도 선택 드롭다운                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 7️⃣ 연도별 통계 카드 (4개 지표)                                  │
│    - 해당 연도 읽은 책/쪽수/평균 평점                            │
│    - 연간 목표 진행률                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 8️⃣ 월별 독서량 (Bar Chart) - 클릭 시 월 필터                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│ 9️⃣ 카테고리별 (Radar)     │ 🔟 평점별 (Doughnut)                 │
└──────────────────────────┴──────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════╗
║ 📚 내 책장 (책 목록)                                             ║
╚═════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣1️⃣ 활성 필터 뱃지                                              │
│    [2024년 ×] [3월 ×] [소설 ×] [5점 ×]                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣2️⃣ 상태별 탭 + 정렬                                            │
│    [전체] [완독] [읽는 중] [읽고 싶은]    정렬: [최신순 ▼]      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣3️⃣ 책 목록 그리드 (6열, 반응형)                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 1️⃣4️⃣ 페이지네이션 (12권/페이지)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 섹션별 상세 명세

### 1️⃣ 독서 여정 카드 (Reading Journey)

#### 데이터 구조

```typescript
type ReadingJourney = {
  totalBooks: number; // 총 읽은 책 (전체)
  perfectScoreBooks: number; // 10점 만점 책
  perfectScoreRate: number; // 10점 비율 (%)

  totalPages: number; // 총 읽은 쪽수
  averagePagesPerDay: number; // 하루 평균 쪽수

  readingSince: string; // 독서 시작일 (YYYY-MM-DD)
  readingYears: number; // 독서 년수

  estimatedHours: number; // 예상 독서 시간 (시간)
  estimatedDays: number; // 예상 독서 시간 (일)
};
```

#### 계산 로직

```typescript
// 예상 독서 시간
// 평균 읽기 속도: 분당 1페이지 (보수적 기준)
const estimatedMinutes = totalPages * 1;
const estimatedHours = Math.round(estimatedMinutes / 60);
const estimatedDays = Math.round(estimatedHours / 24);

// 하루 평균 쪽수
const daysSince = Math.floor(
  (new Date() - new Date(readingSince)) / (1000 * 60 * 60 * 24)
);
const averagePagesPerDay = (totalPages / daysSince).toFixed(1);

// 10점 만점 비율
const perfectScoreRate = Math.round((perfectScoreBooks / totalBooks) * 100);
```

#### UI 레이아웃 (2x2 그리드)

```
┌─────────────────────────┬─────────────────────────┐
│ 📚 읽은 책              │ 📖 읽은 쪽수            │
│    127권                │    35,240쪽             │
│    ⭐ 10점: 12권 (9%)   │    📅 하루: 19.3쪽      │
└─────────────────────────┴─────────────────────────┘
┌─────────────────────────┬─────────────────────────┐
│ 📆 독서 기간            │ ⏱️ 예상 독서 시간       │
│    2019.3 ~ 현재 (5년)  │    약 1,762시간 (73일)  │
└─────────────────────────┴─────────────────────────┘
```

#### 컴포넌트 구조

```typescript
// widgets/dashboard/ReadingJourneyCard.tsx
export const ReadingJourneyCard = ({ data }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard
        icon="📚"
        title="읽은 책"
        value={`${data.totalBooks}권`}
        subtitle={`⭐ 10점: ${data.perfectScoreBooks}권 (${data.perfectScoreRate}%)`}
      />
      <StatCard
        icon="📖"
        title="읽은 쪽수"
        value={`${data.totalPages.toLocaleString()}쪽`}
        subtitle={`📅 하루 평균: ${data.averagePagesPerDay}쪽`}
      />
      <StatCard
        icon="📆"
        title="독서 기간"
        value={`${data.readingYears}년`}
        subtitle={`${formatDate(data.readingSince)} ~ 현재`}
      />
      <StatCard
        icon="⏱️"
        title="예상 독서 시간"
        value={`${data.estimatedHours.toLocaleString()}시간`}
        subtitle={`약 ${data.estimatedDays}일`}
      />
    </div>
  );
};
```

---

### 2️⃣ 카테고리별 분포 (Pie Chart)

#### 데이터 구조

```typescript
type CategoryDistribution = {
  category: string; // 카테고리명
  count: number; // 권수
  percentage: number; // 비율 (%)
};

// 예시
const data: CategoryDistribution[] = [
  { category: "소설", count: 44, percentage: 35 },
  { category: "자기계발", count: 32, percentage: 25 },
  { category: "경제경영", count: 25, percentage: 20 },
  { category: "에세이", count: 15, percentage: 12 },
  { category: "기타", count: 11, percentage: 8 },
];
```

#### UI 특징

- **Top 5 카테고리** + 나머지는 "기타"로 묶음
- **비율 + 권수** 함께 표시 (예: "소설 35% (44권)")
- **클릭 시** 해당 카테고리 필터 적용
- **색상**: Tailwind 기본 팔레트 (emerald, blue, purple, orange, gray)

#### 컴포넌트

```typescript
// widgets/dashboard/CategoryPieChart.tsx
import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

export const CategoryPieChart = ({ data, onCategoryClick }: Props) => {
  const COLORS = [
    "#10B981", // emerald-500
    "#3B82F6", // blue-500
    "#8B5CF6", // purple-500
    "#F59E0B", // amber-500
    "#6B7280", // gray-500
  ];

  return (
    <PieChart width={400} height={300}>
      <Pie
        data={data}
        dataKey="count"
        nameKey="category"
        cx="50%"
        cy="50%"
        outerRadius={80}
        label={(entry) => `${entry.category} ${entry.percentage}%`}
        onClick={(entry) => onCategoryClick(entry.category)}
      >
        {data.map((entry, index) => (
          <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value, name, props) => [`${value}권`, name]} />
    </PieChart>
  );
};
```

---

### 3️⃣ 최근 5년 독서량 (Bar Chart)

#### 데이터 구조

```typescript
type YearlyTrend = {
  year: number; // 연도
  count: number; // 권수
};

// 예시
const data: YearlyTrend[] = [
  { year: 2020, count: 15 },
  { year: 2021, count: 20 },
  { year: 2022, count: 18 },
  { year: 2023, count: 22 },
  { year: 2024, count: 92 },
];
```

#### 인사이트 자동 생성

```typescript
// utils/generateYearlyInsight.ts
export const generateYearlyInsight = (data: YearlyTrend[]) => {
  const currentYear = data[data.length - 1];
  const previousYear = data[data.length - 2];

  // 전년 대비 증가율
  const growthRate = Math.round(
    ((currentYear.count - previousYear.count) / previousYear.count) * 100
  );

  // 최고 기록 연도
  const peakYear = data.reduce((max, item) =>
    item.count > max.count ? item : max
  );

  return {
    growthRate,
    peakYear: peakYear.year,
    message:
      currentYear.year === peakYear.year
        ? "올해가 역대 최고 기록이에요! 🎉"
        : `${peakYear.year}년이 최고 기록이에요.`,
  };
};
```

#### UI 특징

- **최근 5년만 표시** (데이터 부족 시 전체)
- **최고 기록 연도 하이라이트** (색상 강조)
- **전년 대비 증가율 표시** (예: "+318%")
- **클릭 시** 해당 연도로 필터 이동 (선택 사항)

---

### 4️⃣ 평점 분포 (Horizontal Bar) + AI 인사이트

#### 데이터 구조

```typescript
type RatingDistribution = {
  rating: number; // 평점 (0, 1, 2, 3, 4, 5, 10)
  count: number; // 권수
  percentage: number; // 비율 (%)
};

type RatingInsight = {
  averageRating: number; // 평균 평점
  personality: string; // 평가 성향
  message: string; // 인사이트 메시지
};
```

#### AI 인사이트 로직

```typescript
// utils/generateRatingInsight.ts
export const generateRatingInsight = (
  distributions: RatingDistribution[]
): RatingInsight => {
  const totalBooks = distributions.reduce((sum, d) => sum + d.count, 0);

  // 평균 평점 계산
  const weightedSum = distributions.reduce(
    (sum, d) => sum + d.rating * d.count,
    0
  );
  const averageRating = (weightedSum / totalBooks).toFixed(1);

  // 낮은 평점 비율 (0~3점)
  const lowRatingBooks = distributions
    .filter((d) => d.rating <= 3)
    .reduce((sum, d) => sum + d.count, 0);
  const lowRatingRate = (lowRatingBooks / totalBooks) * 100;

  // 10점 만점 비율
  const perfectBooks = distributions.find((d) => d.rating === 10)?.count || 0;
  const perfectRate = (perfectBooks / totalBooks) * 100;

  // 성향 판단
  let personality = "";
  let message = "";

  if (lowRatingRate > 40) {
    personality = "엄격한 평가자";
    message = "당신은 매우 엄격한 평가자입니다!";
  } else if (lowRatingRate < 20) {
    personality = "긍정적인 독서가";
    message = "대부분의 책을 즐기시네요!";
  } else {
    personality = "균형 잡힌 평가자";
    message = "좋은 책을 잘 골라 읽으시네요!";
  }

  if (perfectRate > 10) {
    message += " 인생책도 많으시네요! ⭐";
  }

  return { averageRating: Number(averageRating), personality, message };
};
```

#### UI 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ ⭐ 평점 분포 & 선호도                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  평균 평점: 4.2 / 5.0  (전체 127권 기준)                 │
│                                                          │
│  10점 ████████████████ 12권 (9%)   ← 인생책!            │
│   5점 ██████████████████████████████ 38권 (30%)         │
│   4점 ████████████████████████ 32권 (25%)               │
│   3점 ████████████████ 20권 (16%)                       │
│   2점 ██████ 8권 (6%)                                   │
│   1점 ███ 5권 (4%)                                      │
│   0점 ████████ 12권 (9%)  ← 평가 안 함                   │
│                                                          │
│  💡 인사이트: 당신은 엄격한 평가자! (3점 이하 30%)       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 5️⃣ 독서 뱃지 (Phase 2 이후)

#### 뱃지 종류

```typescript
type Badge = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  condition: (stats: BookStats) => boolean;
  unlocked: boolean;
};

const badges: Badge[] = [
  {
    id: "first_book",
    emoji: "📖",
    name: "첫 걸음",
    description: "첫 책 등록",
    condition: (stats) => stats.totalBooks >= 1,
  },
  {
    id: "ten_books",
    emoji: "📚",
    name: "10권 달성",
    description: "10권 완독",
    condition: (stats) => stats.totalBooks >= 10,
  },
  {
    id: "hundred_books",
    emoji: "💯",
    name: "100권 달성",
    description: "100권 완독",
    condition: (stats) => stats.totalBooks >= 100,
  },
  {
    id: "five_years",
    emoji: "🔥",
    name: "5년 연속",
    description: "5년 이상 독서 기록",
    condition: (stats) => stats.readingYears >= 5,
  },
  {
    id: "ten_perfect",
    emoji: "⭐",
    name: "인생책 10권",
    description: "10점 만점 10권",
    condition: (stats) => stats.perfectScoreBooks >= 10,
  },
  {
    id: "yearly_goal",
    emoji: "🎯",
    name: "연간 목표 달성",
    description: "올해 목표 100% 달성",
    condition: (stats) => stats.yearProgress >= 100,
  },
  {
    id: "speed_reader",
    emoji: "⚡",
    name: "다독가",
    description: "3만 쪽 이상 독서",
    condition: (stats) => stats.totalPages >= 30000,
  },
];
```

#### UI 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ 🏅 나의 독서 뱃지                                        │
├─────────────────────────────────────────────────────────┤
│  🔥 5년 연속    📚 100권 달성    ⭐ 인생책 10권         │
│  🎯 2024 목표 달성                                       │
└─────────────────────────────────────────────────────────┘
```

---

### 6️⃣~🔟 연도별 통계 (현재와 동일)

**참고**: [02_핵심_기능.md](./02_핵심_기능.md) 참조

---

### 1️⃣1️⃣ 활성 필터 뱃지

#### UI

```
┌─────────────────────────────────────────────────────────┐
│ 📌 활성 필터:                                            │
│ [2024년 × ] [3월 × ] [소설 × ] [5점 × ]                 │
└─────────────────────────────────────────────────────────┘
```

#### 기능

- **× 클릭 시** 해당 필터만 해제
- **전체 해제 버튼** (선택 사항)
- **필터 없을 시** 숨김

---

### 1️⃣2️⃣ 상태별 탭 + 정렬

#### UI

```
┌─────────────────────────────────────────────────────────┐
│ [전체 92] [완독 75] [읽는 중 10] [읽고 싶은 7]           │
│                                    정렬: [최신순 ▼]     │
└─────────────────────────────────────────────────────────┘
```

#### 정렬 옵션

```typescript
type SortOption =
  | "created_at-desc" // 최신순
  | "created_at-asc" // 오래된순
  | "rating-desc" // 별점 높은순
  | "rating-asc" // 별점 낮은순
  | "title-asc"; // 제목순
```

---

## 🔄 상태 관리 전략

### 필터 상태

```typescript
type FilterState = {
  year: number | null; // 연도 필터 (null = 전체)
  month: number | null; // 월 필터 (1~12, null = 전체)
  category: string | null; // 카테고리 필터
  rating: number | null; // 평점 필터 (0, 1, 2, 3, 4, 5, 10)
  status: BookStatus | "all"; // 상태 필터
  sortBy: SortOption; // 정렬
};
```

### URL 쿼리 파라미터

```
/dashboard?year=2024&month=3&category=소설&rating=5&status=completed&sort=rating-desc
```

### Lift State Up 패턴

```typescript
// app/dashboard/page.tsx (Server Component)
export default async function DashboardPage({ searchParams }: Props) {
  const filters = {
    year: searchParams.year ? Number(searchParams.year) : null,
    month: searchParams.month ? Number(searchParams.month) : null,
    category: searchParams.category || null,
    rating: searchParams.rating ? Number(searchParams.rating) : null,
    status: (searchParams.status as BookStatus) || "all",
    sortBy: (searchParams.sort as SortOption) || "created_at-desc",
  };

  // 데이터 페칭
  const overallStats = await getOverallStats(userId);
  const yearlyStats = await getYearlyStats(userId, filters.year);
  const books = await getFilteredBooks(userId, filters);

  return (
    <DashboardContent
      overallStats={overallStats}
      yearlyStats={yearlyStats}
      books={books}
      filters={filters}
    />
  );
}
```

---

## 📱 반응형 레이아웃

### Breakpoints

```typescript
// Tailwind 기본 브레이크포인트
const breakpoints = {
  sm: "640px", // 모바일
  md: "768px", // 태블릿
  lg: "1024px", // 데스크탑
  xl: "1280px", // 큰 데스크탑
};
```

### 레이아웃 변화

#### 데스크탑 (lg~)

```
[독서 여정 2x2 그리드]
[카테고리 Pie | 5년 Bar] (2열)
[평점 분포 전체]
[뱃지 가로 나열]
```

#### 태블릿 (md~lg)

```
[독서 여정 2x2 그리드]
[카테고리 Pie 전체]
[5년 Bar 전체]
[평점 분포 전체]
[뱃지 가로 나열]
```

#### 모바일 (~md)

```
[독서 여정 1x4 세로]
[카테고리 Pie 스와이프]
[5년 Bar 가로 스크롤]
[평점 분포 세로 배치]
[뱃지 가로 스크롤]
```

### 컴포넌트 예시

```typescript
// 반응형 그리드
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <CategoryPieChart />
  <YearlyTrendChart />
</div>

// 모바일 스크롤
<div className="overflow-x-auto md:overflow-x-visible">
  <YearlyTrendChart />
</div>
```

---

## 🎯 구현 우선순위

### Phase 1 (필수, 1-2시간)

```
✅ 독서 여정 카드 (4개 지표)
✅ 카테고리 파이 차트
✅ 최근 5년 막대 차트
✅ 평점 분포 가로 막대
✅ 상태별 탭 추가
✅ 정렬 기능 추가
```

### Phase 2 (선택, 30분~1시간)

```
⏳ AI 인사이트 메시지
⏳ 독서 뱃지 시스템
⏳ 반응형 레이아웃 최적화
⏳ 애니메이션 효과
```

---

## 📊 API 설계

### GET /api/books/stats/overall

전체 독서 통계 조회

**응답:**

```typescript
{
  journey: ReadingJourney;
  categoryDistribution: CategoryDistribution[];
  yearlyTrend: YearlyTrend[];
  ratingDistribution: RatingDistribution[];
  insights: {
    growthRate: number;
    peakYear: number;
    ratingPersonality: string;
    message: string;
  };
  badges?: Badge[];  // Phase 2
}
```

### GET /api/books/stats/yearly?year=2024

연도별 통계 조회 (기존 API 활용)

---

## 🎨 디자인 토큰

### 색상 팔레트

```typescript
// 차트 색상
const chartColors = {
  primary: "#10B981", // emerald-500 (메인)
  secondary: "#3B82F6", // blue-500
  accent: "#8B5CF6", // purple-500
  warning: "#F59E0B", // amber-500
  neutral: "#6B7280", // gray-500
};

// 평점 색상 그라데이션
const ratingColors = {
  10: "#10B981", // emerald-500 (최고)
  5: "#3B82F6", // blue-500
  4: "#8B5CF6", // purple-500
  3: "#F59E0B", // amber-500
  2: "#F97316", // orange-500
  1: "#EF4444", // red-500
  0: "#9CA3AF", // gray-400 (평가 안 함)
};
```

### 타이포그래피

```typescript
// 제목
h2: "text-2xl font-bold text-gray-900";
h3: "text-xl font-semibold text-gray-800";

// 본문
body: "text-base text-gray-700";
caption: "text-sm text-gray-500";

// 강조
highlight: "text-lg font-bold text-emerald-600";
```

---

## ✅ 체크리스트 (구현 시 확인)

### 필수 기능

- [ ] 전체 독서 통계 섹션 완성
- [ ] 연도별 통계 유지 (기존 기능)
- [ ] 상태별 탭 추가
- [ ] 정렬 기능 추가
- [ ] 복합 필터링 작동 확인
- [ ] 페이지네이션 작동
- [ ] 로딩 상태 UI (Skeleton)
- [ ] 에러 핸들링

### UX 개선

- [ ] 차트 클릭 → 필터 적용 즉시 반영
- [ ] 활성 필터 뱃지 표시
- [ ] 필터 해제 기능
- [ ] 빈 상태 UI (Empty State)
- [ ] 반응형 레이아웃 (모바일/태블릿)

### 성능

- [ ] Server Component로 초기 데이터 페칭
- [ ] 차트 렌더링 최적화
- [ ] 이미지 Lazy Loading
- [ ] 페이지네이션으로 렌더링 제한

---

## 📝 참고 자료

- [Recharts 공식 문서](https://recharts.org/)
- [Tailwind CSS 반응형 가이드](https://tailwindcss.com/docs/responsive-design)
- [Next.js Server Component 패턴](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

---

**작성일**: 2025-12-10
**최종 수정**: 2025-12-10

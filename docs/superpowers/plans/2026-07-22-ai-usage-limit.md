# AI 분석 기능 월별 사용량 제한 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `taste-analysis`, `compatibility` 두 AI 분석 API의 OpenAI 토큰 비용 폭주를 막기 위해, 무료 사용자 기준 월 3회 사용량 제한을 구현한다.

**Architecture:** 신규 `ai_usage_logs` 테이블(마이그레이션 이미 적용 완료)에 실제 OpenAI 호출이 성공할 때마다 로그 1건을 남기고, 각 API 라우트는 호출 직전에 이번 달 로그 수를 세어 한도를 넘으면 429로 막는다. 프론트엔드는 별도 GET API 없이, 기존에 Server Component가 데이터를 미리 계산해 props로 내려주는 패턴을 그대로 따라 남은 횟수를 표시한다.

**Tech Stack:** Next.js 16 App Router (API Route + Server Component), Supabase(PostgreSQL), TypeScript.

## Global Constraints

- 월별 한도는 `3`회, 기능(`taste_analysis`/`compatibility`)별로 별도 카운트한다.
- 리셋 기준은 달력상 매월 1일 00:00이다.
- `ai_usage_logs` 테이블/RLS는 `supabase/migrations/20260722_create_ai_usage_logs.sql`로 이미 DB에 적용되어 있다 — 이 플랜에서 다시 만들 필요 없음.
- 사용량 제한 초과 응답은 상태 코드 `429`, 바디는 `{ error: string }` 하나만 사용한다(별도 `code` 필드 없음) — 기존 두 라우트의 다른 에러 응답과 동일한 형태를 유지한다.
- quota 체크는 캐시 히트·입력값 검증(최소 책 권수 등)을 모두 통과해 "실제로 OpenAI를 호출하기 직전"에만 수행한다. 기록(`recordUsage`)은 OpenAI 호출 및 결과 저장이 **성공한 뒤에만** 한다.
- 새로운 GET API 엔드포인트를 만들지 않는다 — 남은 횟수는 기존 Server Component가 계산해 props로 내려준다.
- 이 저장소에는 자동화된 단위 테스트 러너가 없다(`apps/page0127/package.json`에 test 스크립트 없음, 기존 API 라우트에도 테스트 파일 없음). 각 태스크의 검증은 `npm run type-check` + `npm run lint` + 수동 동작 확인으로 한다 — 새로 테스트 프레임워크를 들여오지 않는다(기존 컨벤션 유지, YAGNI).
- 참고 스펙: `docs/superpowers/specs/2026-07-22-ai-usage-limit-design.md`

---

### Task 1: 사용량 체크 유틸 함수 작성

**Files:**
- Create: `apps/page0127/src/shared/lib/aiUsage.ts`

**Interfaces:**
- Produces:
  - `type AiUsageFeature = 'taste_analysis' | 'compatibility'`
  - `checkUsageLimit(supabase: SupabaseClient, userId: string, feature: AiUsageFeature): Promise<{ allowed: boolean; remaining: number }>`
  - `recordUsage(supabase: SupabaseClient, userId: string, feature: AiUsageFeature): Promise<void>`

- [ ] **Step 1: 파일 작성**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

/** 무료 사용자 월별 허용 횟수 (기능별 독립 카운트) */
const MONTHLY_LIMIT = 3;

export type AiUsageFeature = 'taste_analysis' | 'compatibility';

/**
 * 이번 달(달력 기준 1일 00:00~) 사용 횟수를 세어 한도 초과 여부를 반환한다.
 * 실제 OpenAI 호출 직전에만 호출해야 한다 (캐시 히트·입력값 검증 통과 이후).
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: AiUsageFeature
): Promise<{ allowed: boolean; remaining: number }> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', startOfMonth.toISOString());

  const used = count ?? 0;
  return {
    allowed: used < MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
  };
}

/**
 * 사용 기록 1건을 남긴다. OpenAI 호출과 결과 저장이 모두 성공한 뒤에만 호출해야
 * 한다 — 실패한 시도로 사용자의 quota가 낭비되는 것을 막기 위함이다.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: AiUsageFeature
): Promise<void> {
  await supabase.from('ai_usage_logs').insert({ user_id: userId, feature });
}
```

- [ ] **Step 2: 타입 체크로 검증**

Run: `cd apps/page0127 && npm run type-check`
Expected: 에러 없이 종료 (이 파일은 아직 어디서도 import되지 않으므로 기존 빌드에 영향 없음)

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/shared/lib/aiUsage.ts
git commit -m "feat: AI 기능 월별 사용량 체크 유틸 추가"
```

---

### Task 2: `taste-analysis` 라우트에 사용량 제한 적용

**Files:**
- Modify: `apps/page0127/app/api/taste-analysis/analyze/route.ts`

**Interfaces:**
- Consumes: Task 1의 `checkUsageLimit`, `recordUsage` (`@/shared/lib/aiUsage`)

- [ ] **Step 1: import 추가**

`apps/page0127/app/api/taste-analysis/analyze/route.ts` 4번째 줄(`import { createClient } ...` 다음) 근처, 기존 import 블록에 추가:

```ts
import { checkUsageLimit, recordUsage } from '@/shared/lib/aiUsage';
```

- [ ] **Step 2: 최소 5권 검증 직후, AI 호출 직전에 quota 체크 삽입**

`route.ts:67` (`if (!books || books.length < 5) { ... }` 블록이 끝나는 지점, `// 3. AI 분석 실행` 주석 앞)에 삽입:

```ts
    // 2-1. 이번 달 사용량 확인 (무료 사용자 월 3회 제한)
    const { allowed } = await checkUsageLimit(
      supabase,
      user.id,
      'taste_analysis'
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            '이번 달 무료 분석 횟수(3회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.',
        },
        { status: 429 }
      );
    }

```

- [ ] **Step 3: 분석 결과 저장 성공 직후에 사용량 기록 삽입**

`route.ts:139-145`의 아래 블록:

```ts
    if (analysisError) {
      console.error('분석 결과 저장 실패:', analysisError);
      return NextResponse.json(
        { error: '분석 결과를 저장할 수 없습니다.' },
        { status: 500 }
      );
    }
```

바로 다음 줄(`// 6. 추천 도서 저장` 주석 앞)에 삽입:

```ts

    // 사용량 기록 — 분석이 성공적으로 저장된 뒤에만 기록한다
    await recordUsage(supabase, user.id, 'taste_analysis');
```

- [ ] **Step 4: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없이 종료

- [ ] **Step 5: 수동 확인**

`npm run dev`로 서버를 띄운 뒤, 완독한 책(별점 포함)이 5권 이상인 계정으로 로그인해서 "취향 분석" 버튼을 4번 연속 눌러본다(취향분석 페이지가 아직 남은 횟수를 안 보여주는 상태라 매번 버튼을 눌러야 함 — Task 4에서 프론트가 막아준다). 4번째 요청에서 아래처럼 429가 와야 한다:

```bash
curl -i -X POST http://localhost:3000/api/taste-analysis/analyze \
  -H "Cookie: <브라우저 개발자도구에서 복사한 세션 쿠키>"
```

Expected: `HTTP/1.1 429`, 바디에 `"이번 달 무료 분석 횟수(3회)를 모두 사용했습니다..."`. Supabase 대시보드에서 `ai_usage_logs` 테이블에 `feature = 'taste_analysis'` 행이 3개 쌓였는지도 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add apps/page0127/app/api/taste-analysis/analyze/route.ts
git commit -m "feat: 취향분석 API에 월별 사용량 제한 적용"
```

---

### Task 3: `compatibility` 라우트에 사용량 제한 적용

**Files:**
- Modify: `apps/page0127/app/api/compatibility/analyze/route.ts`

**Interfaces:**
- Consumes: Task 1의 `checkUsageLimit`, `recordUsage` (`@/shared/lib/aiUsage`)

- [ ] **Step 1: import 추가**

`apps/page0127/app/api/compatibility/analyze/route.ts` 상단 import 블록에 추가:

```ts
import { checkUsageLimit, recordUsage } from '@/shared/lib/aiUsage';
```

- [ ] **Step 2: 최소 책 권수 검증 직후, AI 호출 직전에 quota 체크 삽입**

`route.ts:117-124`의 아래 블록:

```ts
    if (!myBooks || myBooks.length < MIN_BOOKS) {
      return NextResponse.json(
        {
          error: `궁합 분석을 위해 내 완독 책(별점 포함)이 ${MIN_BOOKS}권 이상 필요합니다.`,
        },
        { status: 400 }
      );
    }
    if (!targetBooks || targetBooks.length < MIN_BOOKS) {
      return NextResponse.json(
        {
          error: `상대방의 공개된 완독 책(별점 포함)이 ${MIN_BOOKS}권 이상일 때 분석할 수 있습니다.`,
        },
        { status: 400 }
      );
    }
```

바로 다음 줄(`const getName = ...` 앞)에 삽입:

```ts

    // 사용량 확인 (무료 사용자 월 3회 제한)
    // 캐시 히트는 이 지점보다 앞에서 이미 응답을 반환하므로 quota를 소모하지 않는다
    const { allowed } = await checkUsageLimit(
      supabase,
      user.id,
      'compatibility'
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            '이번 달 무료 분석 횟수(3회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.',
        },
        { status: 429 }
      );
    }
```

- [ ] **Step 3: 분석 결과 저장 성공 직후에 사용량 기록 삽입**

`route.ts:204-208`의 아래 블록:

```ts
    if (analysisError) {
      console.error('궁합 분석 저장 실패:', analysisError);
      return NextResponse.json(
        { error: '분석 결과를 저장할 수 없습니다.' },
        { status: 500 }
      );
    }
```

바로 다음 줄(`// 9. 상호 추천 도서 저장` 주석 앞)에 삽입:

```ts

    // 사용량 기록 — 실제로 분석을 유발한 호출자(user.id) 기준으로만 기록한다
    await recordUsage(supabase, user.id, 'compatibility');
```

- [ ] **Step 4: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없이 종료

- [ ] **Step 5: 수동 확인**

두 명의 테스트 계정(각각 완독 5권 이상, 별점 포함)으로 서로 다른 상대와의 궁합 분석을 반복 호출해 4번째부터 429가 오는지 확인하고, `ai_usage_logs`에 `feature = 'compatibility'` 행이 호출자 기준으로 쌓이는지 Supabase 대시보드에서 확인한다. 이미 분석한 쌍을 `force` 없이 다시 조회(캐시 히트)했을 때는 `ai_usage_logs`에 새 행이 추가되지 않는지도 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add apps/page0127/app/api/compatibility/analyze/route.ts
git commit -m "feat: 궁합분석 API에 월별 사용량 제한 적용"
```

---

### Task 4: 취향분석 프론트엔드 — 남은 횟수 표시

**Files:**
- Modify: `apps/page0127/app/(public)/[username]/page.tsx`
- Modify: `apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx`
- Modify: `apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx`

**Interfaces:**
- Consumes: Task 1의 `checkUsageLimit`
- Produces: `PublicLibraryHeaderProps.tasteAnalysisRemaining: number`, `PublicLibraryContentProps.tasteAnalysisRemaining: number`

**구현 노트:** `PublicLibraryHeader`는 기존에도 "분석 가능 책 권수 부족"·"재분석 조건 미충족" 같은 경우를 버튼을 비활성화하는 대신 클릭 시 `toast.error`로 막는 패턴을 쓰고 있다(`handleAnalyzeTaste` 함수 참고). 사용량 초과도 같은 방식으로 통일한다 — 버튼은 항상 클릭 가능하고, 라벨에 남은 횟수를 보여주며, 0일 때 클릭하면 토스트로 안내한다.

- [ ] **Step 1: `page.tsx`에 quota 계산 추가**

`apps/page0127/app/(public)/[username]/page.tsx` 상단 import 블록(`import { getProfileByUsername } ...` 다음 줄)에 추가:

```ts
import { checkUsageLimit } from '@/shared/lib/aiUsage';
```

`page.tsx:113-116`에 해당하는 아래 블록:

```ts
  // 소유자 전용 데이터 — 방문자면 아예 조회하지 않는다
  let analyzableBookCount = 0;
  let newBooksSinceLastAnalysis: number | null = null;
  let analysisHistory: TasteAnalysisSummary[] = [];
```

를 아래로 교체:

```ts
  // 소유자 전용 데이터 — 방문자면 아예 조회하지 않는다
  let analyzableBookCount = 0;
  let newBooksSinceLastAnalysis: number | null = null;
  let analysisHistory: TasteAnalysisSummary[] = [];
  let tasteAnalysisRemaining = 0;
```

그리고 `if (isOwnProfile) { ... }` 블록의 마지막 줄(`newBooksSinceLastAnalysis = newCount ?? 0;` 다음, 블록을 닫는 `}` 앞)에 추가:

```ts

    const { remaining } = await checkUsageLimit(
      supabase,
      profile.id,
      'taste_analysis'
    );
    tasteAnalysisRemaining = remaining;
```

마지막으로 `return` 문의 `<PublicLibraryContent ... />`에 prop 추가 (`analysisHistory={analysisHistory}` 다음 줄):

```tsx
      analysisHistory={analysisHistory}
      tasteAnalysisRemaining={tasteAnalysisRemaining}
```

- [ ] **Step 2: `PublicLibraryContent.tsx`에 prop 전달**

`PublicLibraryContentProps` 타입(`analysisHistory: TasteAnalysisSummary[];` 다음 줄)에 추가:

```ts
  tasteAnalysisRemaining: number;
```

컴포넌트 파라미터 구조분해(`analysisHistory,` 다음 줄)에 추가:

```ts
  tasteAnalysisRemaining,
```

`<PublicLibraryHeader ... />` 호출부(`analysisHistory={analysisHistory}` 다음 줄)에 추가:

```tsx
        tasteAnalysisRemaining={tasteAnalysisRemaining}
```

- [ ] **Step 3: `PublicLibraryHeader.tsx`에 남은 횟수 반영**

`PublicLibraryHeaderProps` 타입(`analysisHistory: TasteAnalysisSummary[];` 다음 줄)에 추가:

```ts
  /** 이번 달 취향분석 남은 횟수 (0~3) — 방문자는 항상 0 */
  tasteAnalysisRemaining: number;
```

컴포넌트 파라미터 구조분해(`analysisHistory,` 다음 줄)에 추가:

```ts
  tasteAnalysisRemaining,
```

`handleAnalyzeTaste` 함수 안, 기존 두 개의 조건 체크 다음(`if (newBooksSinceLastAnalysis !== null && ...) { ... }` 블록 다음, `setIsAnalyzeDialogOpen(true);` 앞)에 추가:

```ts
    if (tasteAnalysisRemaining <= 0) {
      toast.error(
        '이번 달 무료 분석 횟수(3회)를 모두 사용했어요. 다음 달 1일에 초기화돼요.'
      );
      return;
    }

```

버튼 JSX를:

```tsx
              <Button onClick={handleAnalyzeTaste} disabled={isAnalyzing}>
                {isAnalyzing && <Loader2 className='h-4 w-4 animate-spin' />}
                {isAnalyzing ? '분석 중… (최대 1분)' : '취향 분석'}
              </Button>
```

아래로 교체:

```tsx
              <Button onClick={handleAnalyzeTaste} disabled={isAnalyzing}>
                {isAnalyzing && <Loader2 className='h-4 w-4 animate-spin' />}
                {isAnalyzing
                  ? '분석 중… (최대 1분)'
                  : `취향 분석 (${tasteAnalysisRemaining}/3 남음)`}
              </Button>
```

- [ ] **Step 4: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없이 종료

- [ ] **Step 5: 수동 확인**

`npm run dev` 실행 후 본인 `/{username}` 페이지 접속 → 버튼에 `취향 분석 (n/3 남음)`이 보이는지 확인. Task 2에서 3회를 이미 소진했다면 `취향 분석 (0/3 남음)`으로 보이고, 클릭 시 다이얼로그 대신 "이번 달 무료 분석 횟수(3회)를 모두 사용했어요" 토스트가 뜨는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add "apps/page0127/app/(public)/[username]/page.tsx" \
        apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx \
        apps/page0127/src/widgets/public-library/PublicLibraryHeader.tsx
git commit -m "feat: 취향분석 버튼에 이번 달 남은 횟수 표시"
```

---

### Task 5: 궁합분석 프론트엔드 — 남은 횟수 표시

**Files:**
- Modify: `apps/page0127/app/(public)/[username]/compatibility/page.tsx`
- Modify: `apps/page0127/src/features/compatibility/ui/CompatibilityView.tsx`

**Interfaces:**
- Consumes: Task 1의 `checkUsageLimit`
- Produces: `CompatibilityViewProps.compatibilityRemaining: number`

**구현 노트:** `CompatibilityView`는 `PublicLibraryHeader`와 달리 이미 `canAnalyze` boolean으로 "궁합 분석하기" 버튼을 비활성화하는 패턴을 쓰고 있다(`myBooksCount`/`targetBooksCount` 기반). 이 컴포넌트는 그 기존 패턴 그대로 따라 quota도 버튼 비활성화 조건에 포함시킨다 — 컴포넌트마다 이미 있던 패턴을 그대로 따른다.

- [ ] **Step 1: `compatibility/page.tsx`에 quota 계산 추가**

`apps/page0127/app/(public)/[username]/compatibility/page.tsx` 상단 import 블록에 추가:

```ts
import { checkUsageLimit } from '@/shared/lib/aiUsage';
```

기존:

```ts
  const [{ data: analysis }, { count: myBooksCount }, { count: targetBooksCount }] =
    await Promise.all([
      supabase
        .from('compatibility_analyses')
        .select('*')
        .eq('user_id_1', userId1)
        .eq('user_id_2', userId2)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      countCompletedBooks(user.id),
      countCompletedBooks(profile.id),
    ]);
```

를 아래로 교체:

```ts
  const [
    { data: analysis },
    { count: myBooksCount },
    { count: targetBooksCount },
    { remaining: compatibilityRemaining },
  ] = await Promise.all([
    supabase
      .from('compatibility_analyses')
      .select('*')
      .eq('user_id_1', userId1)
      .eq('user_id_2', userId2)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    countCompletedBooks(user.id),
    countCompletedBooks(profile.id),
    checkUsageLimit(supabase, user.id, 'compatibility'),
  ]);
```

`<CompatibilityView ... />` 호출부(`targetBooksCount={targetBooksCount ?? 0}` 다음 줄)에 추가:

```tsx
      compatibilityRemaining={compatibilityRemaining}
```

- [ ] **Step 2: `CompatibilityView.tsx` — props 타입과 gating 로직 반영**

`CompatibilityViewProps` 타입(`isCurrentUserFirst: boolean;` 다음 줄)에 추가:

```ts
  /** 이번 달 궁합분석 남은 횟수 (0~3) */
  compatibilityRemaining: number;
```

컴포넌트 파라미터(`isCurrentUserFirst,` 다음 줄)에 추가:

```ts
  compatibilityRemaining,
```

기존:

```ts
  const canAnalyze =
    myBooksCount >= MIN_BOOKS && targetBooksCount >= MIN_BOOKS;
```

를 아래로 교체:

```ts
  const hasEnoughBooks =
    myBooksCount >= MIN_BOOKS && targetBooksCount >= MIN_BOOKS;
  const canAnalyze = hasEnoughBooks && compatibilityRemaining > 0;
```

`<CompatibilityIntro .../>` 호출부(`canAnalyze={canAnalyze}` 부분)를:

```tsx
        <CompatibilityIntro
          targetName={targetName}
          myBooksCount={myBooksCount}
          targetBooksCount={targetBooksCount}
          hasEnoughBooks={hasEnoughBooks}
          compatibilityRemaining={compatibilityRemaining}
          canAnalyze={canAnalyze}
          isAnalyzing={isAnalyzing}
          onAnalyze={() => setIsDialogOpen(true)}
        />
```

로 교체하고, `<CompatibilityResult .../>` 호출부에 추가:

```tsx
          compatibilityRemaining={compatibilityRemaining}
```

`CompatibilityIntroProps` 타입에 추가:

```ts
  hasEnoughBooks: boolean;
  compatibilityRemaining: number;
```

`CompatibilityIntro` 컴포넌트 파라미터 구조분해에 `hasEnoughBooks, compatibilityRemaining,` 추가. 그리고 기존:

```tsx
      {!canAnalyze && (
        <p className='mt-3 text-sm text-text-subtle'>
          아직 책이 조금 부족해요. 책장이 더 쌓이면 다시 만나요.
        </p>
      )}
```

를 아래로 교체:

```tsx
      {!hasEnoughBooks ? (
        <p className='mt-3 text-sm text-text-subtle'>
          아직 책이 조금 부족해요. 책장이 더 쌓이면 다시 만나요.
        </p>
      ) : compatibilityRemaining <= 0 ? (
        <p className='mt-3 text-sm text-text-subtle'>
          이번 달 무료 분석 횟수(3회)를 모두 사용했어요. 다음 달 1일에
          초기화돼요.
        </p>
      ) : (
        <p className='mt-3 text-sm text-text-subtle'>
          이번 달 {compatibilityRemaining}/3회 남았어요.
        </p>
      )}
```

`CompatibilityResultProps` 타입에 추가:

```ts
  compatibilityRemaining: number;
```

`CompatibilityResult` 컴포넌트 파라미터 구조분해에 `compatibilityRemaining,` 추가. 기존 재분석 버튼 블록:

```tsx
      <div className='flex items-center justify-between rounded-xl bg-sunken p-4'>
        <p className='text-sm text-muted-foreground'>
          분석일:{' '}
          {new Date(analysis.created_at).toLocaleDateString('ko-KR')} — 책장이
          더 쌓였다면 다시 분석해보세요.
        </p>
        <Button
          variant='outline'
          size='sm'
          disabled={isAnalyzing}
          onClick={onReanalyze}
        >
          {isAnalyzing ? '분석 중이에요…' : '다시 분석하기'}
        </Button>
      </div>
```

를 아래로 교체:

```tsx
      <div className='flex items-center justify-between rounded-xl bg-sunken p-4'>
        <p className='text-sm text-muted-foreground'>
          분석일: {new Date(analysis.created_at).toLocaleDateString('ko-KR')}{' '}
          —{' '}
          {compatibilityRemaining > 0
            ? '책장이 더 쌓였다면 다시 분석해보세요.'
            : '이번 달 무료 분석 횟수를 모두 사용했어요. 다음 달 1일에 초기화돼요.'}
        </p>
        <Button
          variant='outline'
          size='sm'
          disabled={isAnalyzing || compatibilityRemaining <= 0}
          onClick={onReanalyze}
        >
          {isAnalyzing ? '분석 중이에요…' : '다시 분석하기'}
        </Button>
      </div>
```

- [ ] **Step 3: 타입 체크 + lint**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: 에러 없이 종료

- [ ] **Step 4: 수동 확인**

`/{username}/compatibility` 페이지에서 인트로 화면과 결과 화면 각각 남은 횟수 문구가 보이는지, Task 3에서 3회를 소진한 상태라면 두 화면의 버튼이 모두 비활성화되는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add "apps/page0127/app/(public)/[username]/compatibility/page.tsx" \
        apps/page0127/src/features/compatibility/ui/CompatibilityView.tsx
git commit -m "feat: 궁합분석 화면에 이번 달 남은 횟수 표시"
```

---

### Task 6: 전체 흐름 수동 통합 확인

**Files:** 없음 (검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~5의 전체 결과물

- [ ] **Step 1: 새 달 시뮬레이션 없이 정상 케이스 확인**

`npm run dev`로 서버 실행. 이번 달 사용 기록이 없는 테스트 계정으로:
1. `/{username}` 접속 → "취향 분석 (3/3 남음)" 확인 → 분석 실행 → 성공 후 "취향 분석 (2/3 남음)"으로 줄어드는지 확인
2. `/{username}/compatibility` 접속(다른 계정과) → "이번 달 3/3회 남았어요" 확인 → 분석 실행 → 성공 후 남은 횟수가 줄어드는지 확인

- [ ] **Step 2: 한도 초과 케이스 확인**

같은 기능을 총 3회 반복 실행한 뒤, 4번째 시도에서:
- 취향분석: 버튼 클릭 시 API 호출 없이 토스트로 즉시 막히는지 확인
- 궁합분석: 버튼 자체가 비활성화되어 있는지 확인
- (버튼 우회 확인용) 브라우저 개발자도구 Network 탭에서 직접 `POST /api/taste-analysis/analyze` 또는 `/api/compatibility/analyze`를 재전송해도 서버가 `429`로 막는지 확인 — 프론트 가드가 아니라 서버가 실제 방어선임을 검증

- [ ] **Step 3: 캐시 히트가 quota를 소모하지 않는지 확인**

이미 분석해둔 상대와의 궁합 페이지를 `force` 없이 재방문(새로고침)해도 `ai_usage_logs`에 새 행이 추가되지 않는지 Supabase 대시보드에서 확인한다.

- [ ] **Step 4: Supabase 대시보드에서 로그 데이터 최종 확인**

`ai_usage_logs` 테이블을 조회해 `user_id`, `feature`, `created_at`이 예상대로 쌓여 있는지 확인한다.

```sql
select feature, count(*), min(created_at), max(created_at)
from ai_usage_logs
group by feature;
```

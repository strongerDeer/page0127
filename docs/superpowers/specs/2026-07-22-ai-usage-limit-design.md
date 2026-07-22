# AI 분석 기능(취향분석·궁합분석) 월별 사용량 제한

## 배경

`taste-analysis`, `compatibility` 두 API는 매 요청마다 OpenAI(`gpt-4o`)를 호출하고, 그 결과의 예상 비용을 `cost_in_cents` 컬럼에 기록해두고 있다(`app/api/taste-analysis/analyze/route.ts`, `app/api/compatibility/analyze/route.ts`). 그런데 이 값을 기준으로 호출을 막는 로직은 없어서, 로그인한 사용자는 이론상 무제한으로 두 기능을 호출할 수 있다. `00_docs/02_핵심_기능.md`에도 "무료 사용자 월 3회 제한"이 계획으로만 적혀 있고 구현되지 않은 상태다.

이 스펙의 목적은 **결제 시스템 도입이 아니라 AI API 토큰 비용을 통제**하는 것이다. 결제(구독) 도입은 별도 트랙으로, 사업자등록 등 선행 조건이 정리된 뒤 논의한다. 지금은 무료 사용자 기준 월별 호출 횟수를 제한해 비용 폭주를 막는 데에만 집중한다.

## 범위

- 대상: `app/api/taste-analysis/analyze/route.ts`, `app/api/compatibility/analyze/route.ts`, 신규 `ai_usage_logs` 테이블, `PublicLibraryHeader.tsx`(취향분석 트리거), `CompatibilityView.tsx`(궁합분석 트리거), 그리고 이 두 컴포넌트에 데이터를 내려주는 Server Component(`/{username}/page.tsx` 및 궁합 페이지).
- 대상 밖: 결제/구독 시스템, 프리미엄 플랜, 유료 전환 시 무제한 처리(이건 quota 체크 로직 위에 조건을 얹는 방식으로 나중에 확장 가능하도록만 설계하고 지금 구현하지는 않는다).

## 데이터 모델

`ai_usage_logs` 테이블 (마이그레이션: `supabase/migrations/20260722_create_ai_usage_logs.sql`, 이미 DB에 적용 완료):

```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('taste_analysis', 'compatibility')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

기존 `taste_analyses`/`compatibility_analyses` 테이블을 재사용하지 않고 별도 로그 테이블을 둔 이유: `compatibility_analyses`는 두 사용자가 결과 행 하나를 공유하는 구조(`user_id_1`, `user_id_2`)라서 "누가 실제로 이번 분석을 유발해 비용을 발생시켰는지"를 구분할 수 없다. 상대방이 캐시된 결과를 나중에 열람하는 경우까지 그 사람의 quota로 잘못 카운트되는 걸 막기 위해, 실제 OpenAI 호출이 성공했을 때만 호출 당사자 기준으로 기록하는 전용 로그 테이블을 둔다.

RLS: 본인 소유 로그만 SELECT/INSERT 가능(다른 테이블과 동일한 패턴).

## 사용량 체크 로직

`apps/page0127/src/shared/lib/aiUsage.ts` (신규):

```ts
const MONTHLY_LIMIT = 3;

export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: 'taste_analysis' | 'compatibility'
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

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: 'taste_analysis' | 'compatibility'
) {
  await supabase.from('ai_usage_logs').insert({ user_id: userId, feature });
}
```

리셋 기준은 달력상 월(매월 1일 00:00 초기화)이다.

## API 라우트 변경

두 라우트 모두, "실제로 OpenAI를 호출할 것이 확정된 시점"에만 quota를 체크하고 소모한다. 기존 검증 순서(인증 → 입력값/최소 책 권수 검증 → `compatibility`의 경우 캐시 히트 확인)는 그대로 두고, 그 다음 실제 `openai.chat.completions.create` 호출 직전에 아래를 끼워 넣는다:

1. `checkUsageLimit` 호출 → `allowed === false`면 `429`로 즉시 응답하고 OpenAI는 호출하지 않는다
   - 응답 형식: `{ error: "이번 달 무료 분석 횟수(3회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다." }` — 기존 에러 응답들과 동일하게 `error` 필드 하나만 사용한다(별도 `code` 필드는 두지 않는다 — 프론트에서 남은 횟수를 미리 보여주므로 정상 흐름에서는 이 429를 사용자가 볼 일이 거의 없고, 보더라도 기존 `toast.error(getApiErrorMessage(...))` 처리로 충분하다).
2. OpenAI 호출 → 성공 시에만(분석 결과 DB 저장 성공 후) `recordUsage` 호출. 호출 실패 시에는 기록하지 않아 사용자의 quota가 낭비되지 않는다.

이 순서 덕분에 `compatibility`의 캐시 히트(같은 쌍의 기존 결과 재사용)와 두 라우트의 최소 책 권수 미달(400 응답) 케이스는 애초에 quota 체크 지점까지 도달하지 않으므로 quota를 소모하지 않는다.

## 프론트엔드 UX

새 GET API를 만들지 않는다. 기존에 Server Component가 "분석 가능한 책 권수" 등을 미리 계산해 Client Component에 props로 내려주는 패턴(`PublicLibraryHeader`의 `analyzableBookCount`, `CompatibilityView`의 `myBooksCount`/`targetBooksCount`)을 그대로 따른다.

- `/{username}/page.tsx`(소유자 전용 데이터 페치 구간)에서 `checkUsageLimit(supabase, user.id, 'taste_analysis')`를 호출해 `tasteAnalysisRemaining`을 `PublicLibraryHeader`에 전달한다.
- `PublicLibraryHeader.tsx`: 버튼 라벨을 `취향 분석 (${remaining}/3 남음)` 형태로 바꾸고, `remaining === 0`이면 버튼을 비활성화하고 "다음 달에 다시 이용해주세요" 안내를 덧붙인다.
- `CompatibilityView`에 데이터를 내려주는 Server Component에서 `checkUsageLimit(supabase, user.id, 'compatibility')`를 호출해 `compatibilityRemaining`을 `CompatibilityView`에 전달한다.
- `CompatibilityView.tsx`: 인트로 화면의 "궁합 분석하기" 버튼과 결과 화면의 "다시 분석하기" 버튼 모두 `compatibilityRemaining === 0`이면 비활성화한다.

## 향후 확장(지금 구현 범위 아님)

사업자등록 등 선행 조건이 정리되어 실제 결제를 붙이게 되면, `checkUsageLimit`이 반환하는 `allowed` 앞에 "유료 사용자인지" 조건을 추가해 유료 사용자는 무제한(또는 상향된 한도)으로 처리하는 방식으로 확장한다. 지금 구조는 이 확장을 염두에 두되, 결제 관련 코드는 포함하지 않는다.

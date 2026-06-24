# Phase 6 · Day 67 — 최종 성능 점검 (React DevTools Profiler)

> 주제: Phase 6에서 적용한 최적화(memo·Compiler·Suspense·번들)를 **Profiler로 한 화면에서 검증**하고, 남은 **병목 2개 이상**을 수치로 개선한다.
> 연결 포인트: page0127에서 가장 무거운 화면 `DashboardContent`를 녹화해 리렌더 병목 진단

---

## 1. 오늘 읽을 코드

- [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — 차트·캘린더·책목록이 모두 모인 539줄 대시보드 (Phase 6 종합 대상)
- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — Day 63에서 `React.memo` 적용한 리스트

> 새 코드를 읽기보다 **그동안 손댄 코드를 Profiler로 다시 보는** 회차다.

---

## 2. 핵심 개념

### (1) Profiler는 "왜 느린가"가 아니라 "무엇이 다시 그려졌나"를 본다

번들 분석(Day 66)이 **다운로드 비용**을 봤다면, Profiler는 **런타임 렌더 비용**을 본다. 둘은 다른 축이다.

- **번들** → 초기 로딩(TTI) 문제
- **Profiler** → 상호작용 시 끊김(불필요 리렌더) 문제

### (2) 녹화 → 커밋 단위로 읽기

React DevTools → **Profiler 탭** → 🔵 녹화 → 앱에서 동작(탭 전환·필터 변경 등) → ⏹ 정지.

화면이 다시 그려질 때마다 막대(**커밋**) 하나가 쌓인다. 커밋을 클릭하면 그때 렌더된 컴포넌트 트리가 보인다.

| 뷰 | 보는 것 | 언제 |
| --- | --- | --- |
| **Flamegraph** | 트리 구조 + 폭=렌더 시간 | 어디가 비싼지 위치 파악 |
| **Ranked** | 비싼 순 정렬 | 가장 느린 컴포넌트부터 |

### (3) 색과 회색으로 병목을 가른다

- **노랑·주황** = 렌더에 오래 걸린 컴포넌트
- **회색(빗금)** = 이번 커밋에서 **렌더 안 됨** ← 우리가 원하는 상태
- "왜 렌더됐나" 보려면 설정 ⚙️에서 **Record why each component rendered** 켜기 → hover 시 `Props changed`, `Hooks changed`, `Parent rendered` 표시

### (4) 병목 진단 체크리스트

```
□ 한 번 클릭에 커밋이 여러 개 쌓인다       → setState 중복 호출 의심
□ 입력과 무관한 컴포넌트가 매번 노란색      → memo 누락 / 부모 리렌더 전파
□ "Parent rendered"가 hover 이유로 뜬다     → 자식 memo or 부모 분리 필요
□ 리스트 전체가 항목 1개 바뀔 때 다 렌더    → 항목 memo + key 안정성 확인
```

---

## 3. page0127 실제 코드 사례 — DashboardContent

이 한 컴포넌트가 Phase 6 기법을 거의 다 담고 있다. Profiler로 각 기법이 **실제로 작동하는지** 검증한다.

```typescript
// DashboardContent.tsx — 상태가 모이는 539줄 대시보드
const [isPending, startTransition] = useTransition(); // Day 59
const handleX = useCallback(/* ... */);                // Compiler 대상(Day 64)

// 차트는 dynamic 분리 → 초기 커밋엔 회색이어야 정상 (Day 66)
const DashboardCharts = dynamic(() => import('.../DashboardCharts'), {
  ssr: false,
  loading: () => <div className='h-[700px] animate-pulse ...' />,
});
```

**검증 포인트 (Profiler로 직접 확인):**

| 기대 | Profiler에서 보이는 모습 |
| --- | --- |
| 차트 dynamic 분리(Day 66) | 첫 커밋에 `DashboardCharts` 자리가 **skeleton만**, 차트는 늦게 등장 |
| `DashboardBookList` memo(Day 63) | 상단 필터 바꿔도 책 목록 항목이 **회색 유지** |
| Compiler 자동 메모(Day 65) | 무관한 핸들러 변경에도 자식 카드가 **안 렌더** |

> 만약 필터 한 번 바꿨는데 `DashboardBookList` 항목 전체가 노랗다 → memo가 **새 객체/함수 prop** 때문에 깨진 것. 그게 오늘의 병목 #1 후보다.

---

## 🔬 실제 측정 결과 (2026-06-24 실행)

> DevTools Profiler 패널은 확장 UI라 헤드리스로 못 잡는다. 대신 **React `<Profiler>` API**를 `DashboardContent` 최상위에 임시로 감싸 `onRender`의 `actualDuration`을 콘솔에 찍고, 실제 로그인 세션으로 `/dashboard`를 측정했다. (측정 후 코드 원복)

### 측정 환경

- 실제 Supabase 로그인 세션으로 `/dashboard` 진입 (책 3권 데이터)
- 진입 직후 차트 자리는 **회색 skeleton** → `dynamic`(Day 66)이 배운 대로 동작 확인 ✅

### 수치

| 항목      | 값                                  |
| --------- | ----------------------------------- |
| phase     | **`update`** (mount는 버퍼 밖으로 밀림) |
| 커밋 횟수 | **50,000+** (콘솔 버퍼 상한까지 참)  |
| 누적 렌더 | **42,832ms** (≈ 42.8초)             |
| 평균 / 최대 | **0.86ms** / **16.70ms**          |

### 해석 — 오늘의 병목

페이지를 가만히 둬도 `update`가 수만 번. 차트 로딩 구간에 리렌더가 **burst**로 쏟아진다.

1. **각 update가 0.86ms로 싸다** → Day 63 `React.memo` + Day 65 Compiler가 자식 리렌더를 막아서다. _그 최적화가 없었다면 같은 횟수 × 큰 트리 = 앱 마비._ 배운 게 **피해를 줄이고 있다는 실증**.
2. **하지만 횟수(원인)는 그대로** → memo는 _증상 완화_ 지 원인 해결이 아니다. 진짜 개선은 "왜 이렇게 자주 리렌더되나"를 없애는 것.

### 남은 과제 (원인 추적)

- useEffect들(검색 디바운스 `setTimeout`, Escape keydown)은 정상 → 무한루프 아님
- 가장 의심: **Recharts `ResponsiveContainer`의 크기 measure 루프** (skeleton→실제 전환 시 높이 측정 불안정). 단, **단정 금지** — DevTools Profiler로 "왜 렌더됐나(Record why)"를 켜고 재현해 확인할 것

> **한 줄 교훈:** memo·Compiler는 리렌더를 _싸게_ 만들 뿐, **횟수 자체는 못 줄인다.** burst를 만드는 setState/measure 원인을 따로 잡아야 진짜 개선이다.

---

## 4. 정리 — 한 줄 규칙

> **회색이 많을수록 좋은 화면이다.** Profiler 녹화 후 "이건 왜 노란색이지?"를 2개 찾아 회색으로 바꾸면 그게 곧 개선이다.

| 신호 | 원인 | 처방 |
| --- | --- | --- |
| 클릭당 커밋 2~3개 | state 분산 업데이트 | `useReducer`로 묶기 / batching |
| 무관 컴포넌트 노랑 | 부모 리렌더 전파 | `React.memo` + prop 안정화 |
| 리스트 전체 리렌더 | 항목 memo 누락 | 항목 컴포넌트 memo + 안정 `key` |
| 초기 커밋이 무거움 | 큰 컴포넌트 동기 로드 | `next/dynamic` lazy |

---

## 5. 오늘 실험 (2가지)

1. **병목 #1 — memo 작동 검증**
   `DashboardContent`에서 상단 정렬/필터 `Select`를 바꾸며 녹화 → `DashboardBookList` 항목이 회색이면 ✅, 노랑이면 전달 prop 중 **인라인 객체/함수**를 찾아 `useMemo`/`useCallback`(또는 Compiler 신뢰)으로 안정화 후 **전후 렌더 시간 비교**.

2. **병목 #2 — 초기 커밋 무게**
   대시보드 첫 진입을 녹화 → 가장 폭 넓은 커밋의 **commit duration(ms)** 기록 → 무거운 동기 컴포넌트 1개를 `dynamic`으로 분리하거나 Suspense 경계로 분할 → 같은 진입을 다시 녹화해 ms가 줄었는지 **숫자로** 확인.

> 두 실험 모두 **개선 전/후 ms를 메모**해 두면 Day 68 회고의 "개선 내역"이 된다.

---

## 6. 다음 Day 예고

**Day 68 — 전체 복습 & 회고**: Phase 1~6 개념을 마인드맵으로 정리하고, Day 63~67에서 수치로 개선한 내역을 학습 일지로 마무리한다. (Phase 6 종료 🎉)

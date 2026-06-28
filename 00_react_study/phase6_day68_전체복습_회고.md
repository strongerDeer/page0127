# Day 68 — 전체 복습 & 회고 🎓

> **Phase 6 마지막 / 68일 스터디 완주**
> 목표: Phase 1-6 개념을 마인드맵으로 묶고, page0127에 실제로 반영한 개선 내역을 정리한다.

---

## 1. 오늘 정리할 자료

- 전체 스케줄: [00_STUDY_SCHEDULE.md](00_STUDY_SCHEDULE.md)
- Phase별 일지: [phase1](phase1_day01_단방향데이터흐름.md) · [phase2](phase2_day10_useState_함수형업데이트.md) · [phase3](phase3_day28_children-composition.md) · [phase4](phase4_day49_복습.md) · [phase5](phase5_day50_useActionState개요.md) · [phase6](phase6_day57_useFormStatus_19문법.md)
- 개선 근거: `git log --oneline` (Perf / Feat / Refactor 커밋)

---

## 2. Phase 1-6 개념 마인드맵 🧠

```
React 스터디 (68일)
│
├─ Phase 1 · 기본 개념 (Day 1-9)
│   ├─ 단방향 데이터 흐름 → 상태 끌어올리기(lifting state up)
│   ├─ 파생 상태 vs 독립 상태 (계산 가능하면 state로 두지 않는다)
│   ├─ 컴포넌트 분리 기준 / key는 "안정적 식별자"
│   └─ 렌더링이 언제 일어나는가 + StrictMode 이중 호출
│
├─ Phase 2 · 훅 (Day 10-27)
│   ├─ useState: 함수형 업데이트 · lazy init · 불변성
│   ├─ useEffect: 기본/남용/의존성배열/클린업 (← "이펙트가 필요 없는 경우")
│   ├─ ref 계열: useRef · forwardRef · useImperativeHandle
│   ├─ useReducer (복잡한 상태 전이)
│   └─ 성능/동시성 훅: useMemo·useCallback·useDeferredValue·useTransition·useId·useLayoutEffect
│
├─ Phase 3 · 컴포넌트 패턴 (Day 28-39)
│   ├─ children 합성 · Portal
│   ├─ Compound Component (+ controlled)
│   ├─ Context (+ 성능: 분리/메모) · Custom Hook
│   ├─ Error Boundary
│   └─ 상태 구조 설계 → FSD 레이어(entities→features→widgets) 의존 방향
│
├─ Phase 4 · Next.js 실무 + TanStack Query (Day 40-49)
│   ├─ Server Component 우선 / Client Component 최소화
│   └─ TanStack Query 설계 (캐싱·keepPreviousData)
│
├─ Phase 5 · React 19 핵심 (Day 50-56)
│   ├─ useActionState (개요 + 실습)
│   ├─ useOptimistic (+ 롤백)
│   ├─ use 훅 (Promise/Context 읽기)
│   └─ Server Actions
│
└─ Phase 6 · 성능 / 동시성 (Day 57-68)
    ├─ useFormStatus + React 19 문법(<Context>·metadata)
    ├─ React 19.2: <Activity> · useEffectEvent
    ├─ useTransition 심화 + Suspense 조합 + 중첩 경계
    ├─ Error Boundary 심화 (reset)
    ├─ React.memo → React Compiler (자동 메모이제이션)
    └─ 번들 최적화 → 최종 성능 점검
```

---

## 3. page0127 실제 개선 내역 (Phase ↔ 커밋 매핑) 🔧

| Phase | 학습 개념 | page0127 적용 (커밋) |
| --- | --- | --- |
| 3 | 컴포넌트 패턴/표준화 | `PageContainer`로 너비·여백 표준화 (`fcaf383`) |
| 5 | useOptimistic | 책 좋아요 버튼 낙관적 업데이트 + 롤백 (`20ce33f`) |
| 5/6 | React 19 문법 | Context 간소화 + `useFormStatus` 도입 (`c8becec`) |
| 6 | useEffectEvent | 무한스크롤·구독 Effect의 deps 문제 해결 (`6127cb6`) |
| 4 | TanStack Query | 캘린더 월 이동 `keepPreviousData` (`c611651`) |
| 4 | SC 데이터 페칭 | 페칭 waterfall → `Promise.all` 병렬화 (`d3c4a22`) |
| 3/6 | Error Boundary + Suspense | 에러 경계 강화·`ErrorFallback` 추출·`global-error` (`fc90b11`) |
| 6 | React.memo | `DashboardBookList` 그리드 아이템 메모 (`375dd6c`) |
| 6 | React Compiler | 도입 후 수동 `memo`/`useMemo` 제거 (`cad9c6b`) |
| 6 | 번들 최적화 | `lucide-react` tree-shaking + analyze (`ed7a314`, `d14fe52`) |
| 6 | 리렌더 제어 | 차트 `isAnimationActive={false}`로 burst 제거 (`62c0b7f`) |

> 💡 **회고 포인트**: "개념 학습 → 같은 주의 page0127 실험 → 커밋"으로 연결한 게 핵심.
> 추상 개념이 아니라 **내 앱의 측정 가능한 변화**로 남았다.

---

## 4. 스스로에게 남기는 규칙 (한 줄 요약) 📌

- **상태**: 계산 가능하면 state로 두지 말고 파생시킨다.
- **Effect**: "렌더 결과를 외부와 동기화"가 아니면 Effect를 쓰지 않는다.
- **메모이제이션**: 먼저 측정(Profiler) → 병목 확인 → memo. 이제는 **React Compiler가 기본**, 수동 memo는 예외.
- **데이터 페칭**: 독립 요청은 무조건 병렬(`Promise.all`), 전환은 `keepPreviousData`로 끊김 제거.
- **에러/로딩**: Suspense·Error Boundary는 **짝지어** 좁은 단위로 배치한다.

---

## 5. 오늘 실험 (2가지) 🧪

1. **마인드맵 손으로 다시 그리기**: 위 트리를 안 보고 빈 종이에 Phase 6개를 복원해본다. 막히는 Phase가 가장 약한 영역 → 다음 심화 1순위.
2. **개선 효과 수치화**: `npm run build` 또는 bundle-analyzer로 현재 번들 크기를 측정하고, Phase 6 시작 전(`ec7c8e1` 이전) 대비 줄어든 폭을 한 줄로 기록한다. ("개선 내역 정리" 산출물 완성)

---

## 6. 스터디 완주 🎉

68일 / Phase 6단계 완료. 다음 단계 후보:
- **약한 Phase 재방문**(실험 1에서 막힌 영역) → 심화 미니 스터디
- **page0127 → 실서비스 패턴 이식** (측정 기반 최적화 루틴 정착)
- 새 주제: 테스트(RTL) · 접근성(a11y) · 상태관리 라이브러리 비교

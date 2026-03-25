# Day 09 — Strict Mode

> Phase 1 | 2026-03-31
> 연결 코드: `apps/page0127/app/layout.tsx`, `apps/page0127/next.config.ts`

---

## 이 프로젝트의 Strict Mode 상태

```ts
// next.config.ts — reactStrictMode 설정 없음
const nextConfig: NextConfig = {
  transpilePackages: [...],
  images: { ... },
  // reactStrictMode 없음
};
```

명시하지 않아도 **Next.js 13+부터 기본값이 `true`** 다.
즉, 지금 이 프로젝트는 Strict Mode가 켜져 있다.

---

## Strict Mode가 하는 일

**개발 환경에서만** 작동한다. 프로덕션 빌드(`npm run build`)에는 영향 없다.

### 컴포넌트를 두 번 렌더링한다

```
개발 환경 (Strict Mode ON)
컴포넌트 마운트 → 언마운트 → 다시 마운트

이유: "한 번이든 두 번이든 결과가 같아야 한다" = 순수 함수 검증
```

실제로 `console.log`를 찍으면 두 번 출력되는 걸 볼 수 있다:

```tsx
export const NotificationDropdown = ({ userId }) => {
  console.log('렌더링!'); // 개발에서는 두 번 출력됨

  return ...;
}
```

### useEffect를 두 번 실행한다

```
마운트 → effect 실행 → (Strict Mode) 언마운트 → 클린업 실행 → 다시 마운트 → effect 다시 실행
```

---

## 왜 두 번 실행하는가

React가 "이 effect에 클린업이 제대로 되어있나?" 를 강제로 테스트하는 것이다.

```tsx
// ✅ 클린업이 있으면 두 번 실행해도 문제없음
useEffect(() => {
  const subscription = supabase
    .channel('notifications')
    .subscribe();

  return () => {
    subscription.unsubscribe(); // 클린업 → Strict Mode가 이걸 호출해서 정리함
  };
}, []);

// ❌ 클린업이 없으면 Strict Mode에서 구독이 두 번 등록됨
useEffect(() => {
  const subscription = supabase
    .channel('notifications')
    .subscribe();
  // 클린업 없음 → 두 번 마운트되면 구독 2개 생김
}, []);
```

Strict Mode가 없었다면 이 버그는 프로덕션에서야 발견된다.
Strict Mode 덕분에 개발 중에 미리 발견할 수 있다.

---

## 이 프로젝트에서 확인할 수 있는 것

`features/notification/` 의 알림 구독이 두 번 등록되는지 확인:

```
1. 개발 서버 실행 (npm run dev)
2. 브라우저 Network 탭 열기
3. 페이지 새로고침
4. Supabase WebSocket 연결이 2개인지 1개인지 확인
```

클린업이 제대로 되어 있으면 최종적으로 1개만 남는다.

---

## Strict Mode 끄는 법 (권장하지 않음)

```ts
// next.config.ts
const nextConfig: NextConfig = {
  reactStrictMode: false, // ← 이렇게 끌 수 있지만
};
```

끄면 편하지만 숨어있던 버그가 프로덕션에서 터진다. **끄지 않는 게 맞다.**

---

## 핵심 요약

```
Strict Mode = 개발 환경 전용 안전망

두 번 렌더링 → 렌더 함수에 부작용 없는지 검증
두 번 effect → 클린업 함수가 제대로 있는지 검증

프로덕션에는 영향 없음
Next.js 13+는 기본으로 켜져 있음
```

---

## Phase 1 완료

Day 01 ~ 09 로 React 기본 개념 한 사이클이 끝났다.

| Day | 주제 | 핵심 |
|-----|------|------|
| 01 | 단방향 데이터 흐름 | props 내려주고, 콜백으로 올린다 |
| 02 | 상태 끌어올리기 | 공유가 필요하면 공통 부모로 올린다 |
| 03 | 파생 상태 vs 독립 상태 | 계산 가능하면 state 만들지 않는다 |
| 04 | 파생 상태 실습 | filteredBooks, totalPages는 파생 상태 |
| 05 | 컴포넌트 분리 기준 | 재사용, 자체 상태, 가독성 |
| 06 | Key | 안정적이고 고유한 값 (id 우선) |
| 07 | 렌더링이 언제 일어나는가 | state/props 변경, 부모 렌더링 |
| 08 | 렌더링 심화 | 아래로만 전파, 형제는 무관 |
| 09 | Strict Mode | 개발 환경 안전망, 두 번 실행 |

다음은 **Phase 2 — 훅 제대로 이해하기** (Day 10부터)

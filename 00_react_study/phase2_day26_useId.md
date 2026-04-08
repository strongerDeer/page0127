# Day 26 — useId

## 오늘 읽을 코드

- [BookRegistrationForm.tsx](../apps/page0127/src/features/book/ui/BookRegistrationForm.tsx) — `htmlFor` + `id` 하드코딩 패턴
- [CategoryFilter.tsx](../apps/page0127/src/features/stats/ui/CategoryFilter.tsx) — 필터 UI (버튼 기반)

---

## 핵심 개념

### useId란?

React 18에서 추가된 훅. **컴포넌트 인스턴스마다 고유한 ID**를 생성한다.

```tsx
import { useId } from 'react';

const MyInput = ({ label }: { label: string }) => {
  const id = useId(); // ":r0:", ":r1:", ... 형태로 생성

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </div>
  );
};
```

### 왜 필요한가?

```tsx
// ❌ 하드코딩 — 같은 컴포넌트를 두 번 쓰면 id 충돌
<Label htmlFor='status'>독서 상태</Label>
<select id='status' />

// 하드코딩된 id로 컴포넌트를 재사용하면:
<BookRegistrationForm /> {/* id="status" */}
<BookRegistrationForm /> {/* id="status" 충돌! */}
```

```tsx
// ✅ useId — 인스턴스마다 고유 id 보장
const statusId = useId();
<Label htmlFor={statusId}>독서 상태</Label>
<select id={statusId} />
```

### SSR 안전성

- `Math.random()` → 서버/클라이언트 값이 달라 하이드레이션 오류 발생
- `useId` → 서버와 클라이언트에서 **동일한 id** 생성 (React가 트리 위치 기반으로 계산)

### 한 컴포넌트에서 여러 id가 필요할 때

```tsx
const Form = () => {
  const baseId = useId();

  return (
    <>
      <label htmlFor={`${baseId}-name`}>이름</label>
      <input id={`${baseId}-name`} />

      <label htmlFor={`${baseId}-email`}>이메일</label>
      <input id={`${baseId}-email`} />
    </>
  );
};
// useId를 필드마다 호출하지 않고, 접미사로 구분
```

---

## page0127 실제 코드 사례

### 현재 패턴 (BookRegistrationForm.tsx)

```tsx
// 현재: 하드코딩된 id
<Label htmlFor='status'>독서 상태 *</Label>
<select id='status' value={status} ... />

<Label htmlFor='completed_date'>완독일 *</Label>
<Input id='completed_date' type='date' ... />

<Label htmlFor='show_start_date'>시작일 추가 (옵션)</Label>
<input id='show_start_date' ... />
```

### useId 적용 후

```tsx
'use client';

import { useId } from 'react';

export const BookRegistrationForm = (...) => {
  const formId = useId();

  const ids = {
    status: `${formId}-status`,
    completedDate: `${formId}-completed-date`,
    showStartDate: `${formId}-show-start-date`,
    oneLineReview: `${formId}-one-line-review`,
    personalMemo: `${formId}-personal-memo`,
    tags: `${formId}-tags`,
    isPublic: `${formId}-is-public`,
  };

  return (
    <>
      <Label htmlFor={ids.status}>독서 상태 *</Label>
      <select id={ids.status} ... />

      <Label htmlFor={ids.completedDate}>완독일 *</Label>
      <Input id={ids.completedDate} type='date' ... />
    </>
  );
};
```

### CategoryFilter — 체크박스로 바꾼다면

```tsx
'use client';

import { useId } from 'react';

export const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) => {
  const baseId = useId();

  return (
    <div className='mb-6'>
      <h3 className='mb-3 text-sm font-semibold text-gray-700'>카테고리별 독서량</h3>
      <div className='flex flex-wrap gap-2'>
        {categories
          .filter((cat) => cat.count > 0)
          .map((cat) => {
            const checkboxId = `${baseId}-${cat.category}`;
            return (
              <div key={cat.category} className='flex items-center gap-1'>
                {/* label과 input이 htmlFor/id로 연결 → 레이블 클릭도 체크됨 */}
                <input
                  type='checkbox'
                  id={checkboxId}
                  checked={selectedCategory === cat.category}
                  onChange={() => onSelectCategory(
                    selectedCategory === cat.category ? null : cat.category
                  )}
                />
                <label htmlFor={checkboxId}>
                  {cat.category} ({cat.count})
                </label>
              </div>
            );
          })}
      </div>
    </div>
  );
};
```

---

## 정리

| 상황 | 방법 |
|------|------|
| 하드코딩 id | 재사용 시 충돌 위험 |
| 컴포넌트 하나에 여러 id | `useId()` 하나 + 접미사 |
| SSR (Next.js) | `useId` 필수 — `Math.random()` 금지 |
| shadcn/ui 내부 | 이미 `useId` 사용 중 |

> **규칙**: `label-input` 연결이 필요하면 무조건 `useId`. 하드코딩 id는 재사용 불가.

---

## 오늘 실험

### 실험 1 — id 충돌 확인

BookRegistrationForm을 두 번 렌더링해서 하드코딩 id vs useId 결과를 브라우저 개발자 도구로 비교해본다.

```tsx
// 테스트용 페이지에서
<BookRegistrationForm />
<BookRegistrationForm />
// Elements 탭에서 id="status"가 두 개 있는지 확인
```

### 실험 2 — useId 값 출력

```tsx
const id = useId();
console.warn('생성된 id:', id); // ":r0:", ":r1:", ... 형태 확인
```

React가 트리 구조 기반으로 어떤 id를 생성하는지 직접 확인한다.

---

## 다음 Day 예고

**Day 27 — useRef (DOM 접근)**: ref로 input에 직접 포커스 주기, 스크롤 제어

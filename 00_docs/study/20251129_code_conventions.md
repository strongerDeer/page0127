# 📋 코드 컨벤션

> 작성일: 2025-11-29
> 목적: 일관된 코드 스타일 유지 및 팀 협업 효율성 향상

---

## 🎯 핵심 원칙

1. **Prettier**: 코드 포매팅 (자동)
2. **ESLint**: 코드 품질 검사 및 규칙 강제
3. **충돌 방지**: Prettier와 ESLint 규칙 분리
4. **자동화**: VS Code 저장 시 자동 포맷 + 린트 수정

---

## 📦 Import 자동 정렬 (✅ 린트 설정)

### 라이브러리: `eslint-plugin-simple-import-sort`

**선택 이유:**

- 설정이 간단하고 직관적
- FSD 구조에 맞춰 커스텀 그룹 정의 가능
- ESLint `--fix` 옵션으로 자동 수정
- VS Code 저장 시 자동 정렬

### Import 정렬 순서

```typescript
// 1. React 관련
import { useState } from "react";
import { createRoot } from "react-dom";

// 2. Next.js 관련
import { cookies } from "next/headers";
import Link from "next/link";

// 3. 외부 라이브러리
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 4. 내부 모듈 - FSD 순서
import { Button } from "@/shared/ui/button";
import { createClient } from "@/shared/config/supabase/server";
import { User } from "@/entities/user";
import { LoginForm } from "@/features/auth/login-form";
import { Header } from "@/widgets/header";

// 5. 상대 경로
import { helper } from "./utils";
import { LocalComponent } from "../components/local";

// 6. 타입 import
import type { UserType } from "@/entities/user/types";

// 7. 스타일/에셋
import "./styles.css";
import logo from "./logo.png";
```

**ESLint 규칙:**

```javascript
'simple-import-sort/imports': ['error', { groups: [...] }]
'simple-import-sort/exports': 'error'
```

---

## 🏗️ FSD 아키텍처 규칙

### 레이어 구조 및 의존성 규칙

```
app      → widgets, features, entities, shared (모두 가능)
widgets  → features, entities, shared
features → entities, shared
entities → shared
shared   → (다른 레이어 import 불가)
```

**참고**: 현재 린트 자동 검증은 설정되지 않았습니다. 코드 리뷰 시 수동으로 확인 필요.

---

## ⚛️ React 컨벤션

### 1. 화살표 함수 사용 (✅ 린트 설정)

**규칙**: 모든 React 컴포넌트는 **화살표 함수**로 작성

```typescript
// ✅ 올바른 방식
export const LoginPage = () => {
  return <div>Login</div>;
};

// ❌ 잘못된 방식
export function LoginPage() {
  return <div>Login</div>;
}
```

**왜 화살표 함수를 사용하나?**

1. **일관성**: 프로젝트 전체에서 동일한 스타일 유지
2. **this 바인딩 문제 해결**: React에서 발생할 수 있는 `this` 바인딩 문제 방지
3. **Named Export와 호환성**: `export const`와 자연스럽게 결합

**ESLint 규칙:**

```javascript
'react/function-component-definition': ['error', {
  namedComponents: 'arrow-function',
  unnamedComponents: 'arrow-function'
}]
```

---

### 2. Named Export 사용

**규칙**: 컴포넌트는 **Named Export** 사용 권장

```typescript
// ✅ Named Export (권장)
export const LoginPage = () => {};

// ❌ Default Export (지양)
export default function LoginPage() {}
```

**이유:**

- 리팩토링 시 import 이름 자동 변경
- 명시적인 코드, IDE 자동완성 지원

**참고**: Next.js의 `app/page.tsx`, `app/layout.tsx` 등은 Default Export 필수

---

### 3. Hooks은 컴포넌트 최상위에서만 호출

```typescript
// ✅ 올바른 방식
export const Component = () => {
  const [state, setState] = useState(0);
  useEffect(() => {}, []);
  return <div />;
};

// ❌ 잘못된 방식
if (condition) {
  useState(0); // 조건문 안에서 호출 금지!
}
```

**ESLint 규칙 (자동 적용):**

```javascript
'react-hooks/rules-of-hooks': 'error'
'react-hooks/exhaustive-deps': 'warn'
```

---

### 4. Props Drilling vs Context

- **2-3 depth까지**: props 전달
- **그 이상**: Context 또는 상태 관리 라이브러리 고려

---

### 5. Key Props 필수 (✅ 린트 설정)

```tsx
// ✅ 올바른 방식
{
  items.map((item) => <Item key={item.id} {...item} />);
}

// ❌ 잘못된 방식
{
  items.map((item) => <Item {...item} />);
}
```

**ESLint 규칙:**

```javascript
'react/jsx-key': 'error'
```

---

## ⚡ Next.js 컨벤션

### 1. Server Component 우선

**기본 원칙**: Next.js 13+ App Router에서는 **Server Component가 기본**

```typescript
// ✅ Server Component (기본)
export const UserProfile = async () => {
  const user = await fetchUser();
  return <div>{user.name}</div>;
};
```

---

### 2. 'use client' 최소화

**규칙**: `'use client'`는 필요한 곳에만 사용

```typescript
// ✅ Client Component (필요할 때만)
'use client';

import { useState } from 'react';

export const Counter = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

**Client Component가 필요한 경우:**

- `useState`, `useEffect` 등 React Hooks 사용
- 브라우저 이벤트 핸들러 (`onClick`, `onChange` 등)
- 브라우저 전용 API (`localStorage`, `window` 등)

**참고**: 현재 린트 자동 검증은 설정되지 않았습니다. 코드 리뷰 시 수동으로 확인 필요.

---

### 3. 비동기 Server Component 활용

```typescript
// ✅ Server Component는 async 가능
export const UserProfile = async ({ id }: { id: string }) => {
  const user = await fetchUser(id);
  return <div>{user.name}</div>;
};
```

---

### 4. Metadata API 사용

```typescript
// app/page.tsx
export const metadata = {
  title: "Page Title",
  description: "Page Description",
};
```

---

## 📘 TypeScript 컨벤션

### 1. Strict Mode 사용 (✅ 설정)

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true
  }
}
```

---

### 2. Type vs Interface (✅ 린트 설정) -> [check] 이유 필요

**규칙**: 일관성을 위해 **type 우선 사용**

```typescript
// ✅ type 사용 (권장)
type ButtonProps = {
  label: string;
  onClick: () => void;
};

// ❌ interface 사용 (지양)
interface ButtonProps {
  label: string;
  onClick: () => void;
}
```

**ESLint 규칙:**

```javascript
'@typescript-eslint/consistent-type-definitions': ['warn', 'type']
```

**참고**: 확장이 필요한 경우에는 interface 사용 가능

```typescript
interface User {
  id: string;
  name: string;
}

interface AdminUser extends User {
  permissions: string[];
}
```

---

### 3. any 금지 (✅ 린트 설정)

```typescript
// ❌ any 사용 금지
const data: any = fetchData();

// ✅ 타입 정의 또는 unknown 사용
const data: UserData = fetchData();
const data: unknown = fetchData(); // 타입 모를 때
```

**ESLint 규칙:**

```javascript
'@typescript-eslint/no-explicit-any': 'warn'
```

---

### 4. 명시적 함수 반환 타입

**규칙**: TypeScript가 추론 가능하므로 선택사항

```typescript
// ✅ TypeScript가 자동 추론
export const getUser = (id: string) => {
  return { id, name: "John" };
};

// ✅ 복잡한 함수는 명시적으로 작성 권장
export const processData = (data: unknown): ProcessedData => {
  // ...
};
```

---

## 🎨 CSS / SCSS / Tailwind 컨벤션 -> [check] Tailwind vs Sass

### 1. Tailwind: Utility-First 접근

```tsx
// ✅ Tailwind 유틸리티 클래스 사용
<div className="flex items-center gap-4 p-4">

// ❌ 커스텀 CSS 파일 남발하지 않기
```

---

### 2. 조건부 클래스는 `cn()` 유틸리티 사용

```tsx
import { cn } from '@/shared/lib/utils';

<button
  className={cn(
    'px-4 py-2 rounded',
    isActive && 'bg-blue-500',
    disabled && 'opacity-50 cursor-not-allowed'
  )}
>
```

---

### 3. `@apply` 최소화

- Tailwind 장점을 살리기 위해 `@apply` 사용 최소화
- 반복되는 스타일은 컴포넌트로 추상화

---

### 4. SCSS Module 사용 시

```tsx
// ✅ SCSS Module
import styles from "./button.module.scss";

export const Button = () => {
  return <button className={styles.button}>Click</button>;
};
```

**네이밍 규칙:**

- 파일명: `component.module.scss`
- 클래스명: camelCase 또는 kebab-case

---

## 🛠️ Lint & Format 명령어

### 전체 검사

```bash
# ESLint 검사 (에러만 표시)
npm run lint

# ESLint 검사 + 자동 수정
npm run lint:fix

# Prettier 검사 (포맷팅 체크만)
npm run format:check

# Prettier 자동 수정
npm run format

# TypeScript 타입 체크
npm run type-check
```

### 권장 워크플로우

1. **개발 중**: VS Code 저장 시 자동 포맷팅 + 린트 수정
2. **커밋 전**: `npm run lint` + `npm run type-check` 실행
3. **CI/CD**: `npm run lint`, `npm run format:check`, `npm run type-check` 모두 통과 필수

---

## 📚 참고 문서

- [Prettier 공식 문서](https://prettier.io/docs/en/)
- [ESLint 공식 문서](https://eslint.org/docs/latest/)
- [eslint-plugin-simple-import-sort](https://github.com/lydell/eslint-plugin-simple-import-sort)
- [Next.js 코딩 컨벤션](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Airbnb React Style Guide](https://airbnb.io/javascript/react/)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)

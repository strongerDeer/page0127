# 🛠️ Prettier & ESLint 완벽 가이드

> 작성일: 2025-11-30
> 목적: Prettier와 ESLint의 역할, 충돌 방지, 자동 정렬 원리 이해

---

## 📌 핵심 개념

### Prettier vs ESLint

| 구분 | Prettier | ESLint |
|------|----------|--------|
| **역할** | 코드 포매팅 (Code Formatter) | 코드 품질 검사 (Code Linter) |
| **담당** | 들여쓰기, 세미콜론, 따옴표, 줄바꿈 등 | 코드 규칙, 버그 가능성, 안티패턴 검사 |
| **자동 수정** | 항상 가능 | 일부만 가능 (`--fix`) |
| **예시** | `printWidth: 80`, `singleQuote: true` | `no-unused-vars`, `react/jsx-key` |

**핵심 원칙: Prettier는 스타일, ESLint는 품질!**

```typescript
// Prettier가 수정하는 것 (스타일)
const user={name:"John",age:30}  // ❌ 포맷 안 맞음
const user = { name: 'John', age: 30 };  // ✅ Prettier가 자동 수정

// ESLint가 검사하는 것 (품질)
const [count, setCount] = useState(0);  // ❌ 사용하지 않는 변수
// ESLint 경고: 'count' is assigned a value but never used
```

---

## 🔥 왜 `.prettierrc.js`가 JSON보다 잘 동작하나?

### 1. CommonJS vs JSON

#### `.prettierrc.js` (CommonJS 모듈)
```javascript
module.exports = {
  semi: true,
  singleQuote: true,
  // 동적 설정 가능
  printWidth: process.env.NODE_ENV === 'production' ? 120 : 80,
};
```

**장점:**
- `module.exports`로 JavaScript 객체 export
- `require.resolve()`로 플러그인 절대 경로 해석 가능
- 동적 설정 가능 (환경변수, 조건문 사용)

#### `.prettierrc` (JSON)
```json
{
  "semi": true,
  "singleQuote": true
}
```

**단점:**
- 정적 데이터만 표현 가능 (함수, 변수 사용 불가)
- 플러그인 경로 해석 실패 가능 (특히 Monorepo)

---

### 2. Monorepo 환경에서의 문제

**Turborepo 프로젝트 구조:**
```
project/
├── apps/
│   └── page0127/
│       ├── .prettierrc       # ❌ 플러그인 찾기 실패 가능
│       ├── .prettierrc.js    # ✅ require.resolve()로 정확한 경로 찾음
│       └── node_modules/
└── node_modules/             # 호이스팅된 패키지 위치
    └── @trivago/prettier-plugin-sort-imports/
```

**JSON 사용 시 문제:**
```json
// .prettierrc (JSON)
{
  "plugins": ["@trivago/prettier-plugin-sort-imports"]
  // ❌ 현재 디렉토리에서만 찾음 → node_modules 호이스팅으로 찾기 실패
}
```

**JS 사용 시 해결:**
```javascript
// .prettierrc.js (CommonJS)
module.exports = {
  plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],
  // ✅ require.resolve()가 Node.js 모듈 해석 규칙으로 정확한 경로 찾음
};
```

---

### 3. VSCode Prettier Extension 동작 원리

VSCode의 Prettier Extension은 다음 순서로 설정 파일을 찾습니다:

1. `.prettierrc.js` (우선순위 높음)
2. `.prettierrc.json`
3. `.prettierrc`
4. `package.json`의 `prettier` 필드

**왜 `.prettierrc.js`가 더 안정적인가?**

```javascript
// .prettierrc.js
module.exports = {
  plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],
  // VSCode Extension이 이 파일을 Node.js 모듈로 로드
  // → require.resolve()가 실행됨
  // → 플러그인 절대 경로 반환
  // → Prettier가 플러그인 정확히 로드
};
```

```json
// .prettierrc (JSON)
{
  "plugins": ["@trivago/prettier-plugin-sort-imports"]
  // VSCode Extension이 JSON 파싱
  // → 문자열만 읽음
  // → 현재 디렉토리 기준으로 플러그인 탐색
  // → Monorepo에서 찾기 실패 가능성 높음
}
```

---

## ⚙️ Import 정렬: Prettier vs ESLint

### 우리 프로젝트의 선택: **ESLint만 사용**

**이유:**
1. **ESLint가 더 강력**: 타입 import 분리, 스타일/에셋 분리 가능
2. **저장 시 자동 수정**: VSCode 설정으로 ESLint `--fix` 자동 실행
3. **충돌 방지**: Prettier는 포매팅만, ESLint는 import 정렬 담당

---

### ESLint Import 정렬 (simple-import-sort)

**설정 위치: `eslint.config.mjs`**

```javascript
'simple-import-sort/imports': [
  'error',
  {
    groups: [
      // 1. React 관련
      ['^react', '^react-dom'],
      // 2. Next.js 관련
      ['^next'],
      // 3. 외부 라이브러리
      ['^@?\\w'],
      // 4. 내부 모듈 - FSD 순서
      ['^@/shared'],
      ['^@/entities'],
      ['^@/features'],
      ['^@/widgets'],
      ['^@/app'],
      // 5. 상대 경로
      ['^\\.'],
      // 6. 타입 import
      ['^.+\\u0000$'],
      // 7. 스타일/에셋
      ['^.+\\.s?css$', '^.+\\.(png|jpg|jpeg|gif|svg)$'],
    ],
  },
]
```

**자동 정렬 예시:**

```typescript
// ❌ 정렬 안 된 상태
import './styles.css';
import { Button } from '@/shared/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { clsx } from 'clsx';

// ✅ ESLint가 자동 정렬 (저장 시)
import { useState } from 'react';

import Link from 'next/link';

import { clsx } from 'clsx';

import { Button } from '@/shared/ui/button';

import './styles.css';
```

---

## 🔄 저장 시 자동 포맷팅/린트 원리

### VSCode 설정 (`.vscode/settings.json`)

```json
{
  // ========================================
  // 1. Prettier: 저장 시 자동 포맷팅
  // ========================================
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,

  // ========================================
  // 2. ESLint: 저장 시 자동 수정
  // ========================================
  "eslint.enable": true,
  "eslint.useFlatConfig": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

---

### 저장 시 실행 순서

파일 저장 시 다음 순서로 실행됩니다:

```
사용자가 Cmd+S (저장)
    ↓
1. Prettier 실행 (formatOnSave: true)
   - 들여쓰기, 세미콜론, 따옴표 등 포맷팅
    ↓
2. ESLint 실행 (source.fixAll.eslint: "explicit")
   - Import 정렬 (simple-import-sort)
   - 사용하지 않는 변수 제거 등
    ↓
3. 파일 저장 완료
```

**왜 Prettier가 먼저 실행되나?**
- Prettier는 **전체 코드 포맷팅** (기본 틀 잡기)
- ESLint는 **코드 품질 규칙 수정** (세부 규칙 적용)
- 순서가 바뀌면 Prettier가 ESLint 수정 내용을 덮어쓸 수 있음

---

### "explicit" vs "always"의 차이

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"  // ✅ 권장
    // "source.fixAll.eslint": "always"  // ⚠️ 너무 공격적
  }
}
```

| 설정 | 동작 | 사용 시기 |
|------|------|-----------|
| `"explicit"` | 명시적으로 수정 가능한 것만 자동 수정 | 일반적인 개발 (권장) |
| `"always"` | 모든 ESLint 규칙 강제 수정 시도 | CI/CD 환경 |

**"explicit"를 사용하는 이유:**
- 수정 불가능한 에러는 자동 수정 시도하지 않음 (불필요한 에러 방지)
- 개발자가 직접 수정해야 하는 부분은 경고만 표시

---

## 🚀 실전 테스트 방법

### 1. Import 정렬 테스트

1. 아무 `.tsx` 파일에 import를 무작위로 작성:
   ```typescript
   import './styles.css';
   import { Button } from '@/shared/ui/button';
   import Link from 'next/link';
   import { useState } from 'react';
   ```

2. **Cmd+S (저장)**

3. ESLint가 자동으로 정렬:
   ```typescript
   import { useState } from 'react';

   import Link from 'next/link';

   import { Button } from '@/shared/ui/button';

   import './styles.css';
   ```

---

### 2. Prettier 포맷팅 테스트

1. 포맷 안 맞는 코드 작성:
   ```typescript
   const user={name:"John",age:30}
   ```

2. **Cmd+S (저장)**

3. Prettier가 자동으로 포맷팅:
   ```typescript
   const user = { name: 'John', age: 30 };
   ```

---

### 3. ESLint 자동 수정 테스트

1. 사용하지 않는 변수 작성:
   ```typescript
   const [count, setCount] = useState(0);
   // count를 사용하지 않음
   ```

2. **Cmd+S (저장)**

3. ESLint 경고 표시 (자동 수정 불가):
   ```
   'count' is assigned a value but never used. (@typescript-eslint/no-unused-vars)
   ```

4. 변수명 앞에 `_` 추가하면 경고 사라짐:
   ```typescript
   const [_count, setCount] = useState(0);
   // ✅ 의도적으로 사용하지 않는 변수임을 표시
   ```

---

## 📋 트러블슈팅

### Q1. 저장해도 Import가 정렬되지 않아요!

**해결 방법:**

1. **VSCode Output 패널 확인:**
   - `Cmd+Shift+P` → "Output" 검색
   - 채널: "ESLint" 선택
   - 에러 메시지 확인

2. **ESLint 서버 재시작:**
   - `Cmd+Shift+P` → "ESLint: Restart ESLint Server"

3. **의존성 재설치:**
   ```bash
   cd apps/page0127
   rm -rf node_modules
   npm install
   ```

4. **VSCode Extension 확인:**
   - Prettier Extension 설치 확인
   - ESLint Extension 설치 확인

---

### Q2. Prettier와 ESLint가 충돌해요!

**증상:**
- 저장할 때마다 코드가 왔다 갔다 함
- import 순서가 계속 바뀜

**해결 방법:**

1. **Prettier의 import 정렬 플러그인 제거** (현재 설정):
   ```javascript
   // .prettierrc.js
   module.exports = {
     // plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')], // ❌ 제거
     semi: true,
     singleQuote: true,
   };
   ```

2. **ESLint만 import 정렬 담당**:
   ```javascript
   // eslint.config.mjs
   'simple-import-sort/imports': 'error'
   ```

3. **eslint-config-prettier 설치 확인**:
   ```json
   // package.json
   {
     "devDependencies": {
       "eslint-config-prettier": "^10.1.8"  // ✅ Prettier 규칙 비활성화
     }
   }
   ```

---

### Q3. `.prettierrc`에서 `.prettierrc.js`로 변경했는데도 안 돼요!

**해결 방법:**

1. **기존 `.prettierrc` 파일 삭제:**
   ```bash
   rm apps/page0127/.prettierrc
   ```

2. **VSCode 재시작:**
   - `Cmd+Q` → VSCode 완전 종료 후 재실행

3. **Prettier 캐시 삭제:**
   ```bash
   rm -rf node_modules/.cache/prettier
   ```

---

## 📚 참고 명령어

### 전체 프로젝트 검사

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

---

## 🎯 결론

### Prettier
- **역할**: 코드 포매팅 (들여쓰기, 세미콜론, 따옴표)
- **설정 파일**: `.prettierrc.js` (CommonJS 모듈)
- **자동 실행**: `editor.formatOnSave: true`

### ESLint
- **역할**: 코드 품질 검사 + Import 정렬
- **설정 파일**: `eslint.config.mjs` (Flat Config)
- **자동 실행**: `source.fixAll.eslint: "explicit"`

### 핵심 원칙
1. **Prettier는 스타일, ESLint는 품질**
2. **Import 정렬은 ESLint만 담당** (충돌 방지)
3. **저장 시 자동 실행** (Prettier → ESLint 순서)
4. **`.prettierrc.js` 사용** (Monorepo 환경에서 안정적)

---

## 📖 추가 학습 자료

- [Prettier 공식 문서](https://prettier.io/docs/en/)
- [ESLint 공식 문서](https://eslint.org/docs/latest/)
- [eslint-plugin-simple-import-sort](https://github.com/lydell/eslint-plugin-simple-import-sort)
- [VSCode Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [VSCode ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

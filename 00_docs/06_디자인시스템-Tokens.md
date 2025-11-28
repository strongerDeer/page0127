# 디자인 시스템 - Design Tokens

모노레포 환경에서 Figma Tokens Studio와 Style Dictionary를 활용한 디자인 토큰 시스템 구축 가이드

---

## 📦 1. Design Tokens 패키지 생성

### 1-1. 디렉토리 구조 생성

```bash
mkdir -p packages/design-tokens/{tokens,src,scripts}
```

**생성되는 구조:**

```
packages/design-tokens/
├── tokens/          # Figma에서 export한 JSON 파일
├── src/            # Style Dictionary가 생성하는 파일 (빌드 결과물)
├── scripts/        # 빌드 스크립트 (선택사항)
└── package.json
```

---

## 📝 2. 토큰 파일 작성

### 2-1. Core Tokens (기본 팔레트)

**파일:** `packages/design-tokens/tokens/core.json`

```json
{
  "core": {
    "color": {
      "primary": {
        "50": { "value": "#f0f9ff", "type": "color" },
        "500": { "value": "#0ea5e9", "type": "color" },
        "900": { "value": "#0c4a6e", "type": "color" }
      },
      "gray": {
        "50": { "value": "#f9fafb", "type": "color" },
        "900": { "value": "#111827", "type": "color" }
      }
    },
    "spacing": {
      "xs": { "value": "4px", "type": "spacing" },
      "md": { "value": "16px", "type": "spacing" }
    },
    "fontSize": {
      "sm": { "value": "14px", "type": "fontSize" },
      "base": { "value": "16px", "type": "fontSize" }
    }
  }
}
```

- `value`: 실제 값
- `type`: 토큰 타입 (Style Dictionary가 변환 시 참조)
- Core tokens는 재사용 가능한 기본 값들

### 2-2. Light Theme (시맨틱 토큰)

**파일:** `packages/design-tokens/tokens/light.json`

```json
{
  "light": {
    "color": {
      "background": {
        "primary": { "value": "{core.color.gray.50}", "type": "color" },
        "secondary": { "value": "#ffffff", "type": "color" }
      },
      "text": {
        "primary": { "value": "{core.color.gray.900}", "type": "color" }
      },
      "action": {
        "primary": {
          "default": { "value": "{core.color.primary.600}", "type": "color" },
          "hover": { "value": "{core.color.primary.700}", "type": "color" }
        }
      }
    }
  }
}
```

- `{core.color.gray.50}`: 중괄호로 다른 토큰 참조
- Semantic tokens: 의미론적 이름 사용 (background, text, action 등)
- 테마 변경 시 참조만 바꾸면 됨

### 2-3. Dark Theme

**파일:** `packages/design-tokens/tokens/dark.json`

```json
{
  "dark": {
    "color": {
      "background": {
        "primary": { "value": "{core.color.gray.900}", "type": "color" },
        "secondary": { "value": "{core.color.gray.800}", "type": "color" }
      },
      "text": {
        "primary": { "value": "{core.color.gray.50}", "type": "color" }
      }
    }
  }
}
```

---

## ⚙️ 3. Style Dictionary 설정

### 3-1. 설정 파일 생성

**파일:** `packages/design-tokens/style-dictionary.config.js` 참고

- `source`: 입력 토큰 파일 (core + 각 테마)

  ```js
    source: [
      'tokens/core.json',
      `tokens/${theme}.json`
    ],
  ```

- `platforms`: 출력 형식 (CSS, JS, JSON 등)

  ```js
  platforms:{
    css: {
      transformGroup: 'css', // 변환 규칙 세트
      buildPath: `src/css/`,
      files: [
        {
          destination: `${theme}.css`,
          format: 'css/variables',
          options: {
            selector: `[data-theme="${theme}"]` // CSS에서 `[data-theme="light"]` 형태로 출력
          }
        }
      ]
    },
    js: {
      // ...
    },
    json: {
      // ...
    },
  }
  ```

---

## 📦 4. package.json 설정

**파일:** `packages/design-tokens/package.json`

```json
{
  "name": "@repo/design-tokens",
  "exports": {
    //  exports: 패키지 외부에서 import 가능한 경로 정의
    "./light": {
      "import": "./src/js/light.js",
      "types": "./src/js/light.d.ts"
    },
    "./dark": {
      "import": "./src/js/dark.js",
      "types": "./src/js/dark.d.ts"
    },
    "./css/light.css": "./src/css/light.css", // 확장자 포함해야 CSS import 가능
    "./css/dark.css": "./src/css/dark.css"
  },
  "files": ["src", "tokens"] // npm publish 시 포함할 파일 목록
}
```

### 4-1. .gitignore 설정

`packages/design-tokens/.gitignore` 에 `src` 추가

- **이유:** `src/` 폴더는 빌드 결과물이므로 Git에서 제외

---

## 🔨 5. 빌드 및 설치

### 5-1. Design Tokens 패키지 빌드

```bash
# design-tokens 디렉토리로 이동
cd packages/design-tokens

# 의존성 설치
npm install

# 토큰 빌드 (CSS, JS, TypeScript 파일 생성)
npm run build
```

**생성되는 파일:**

```
src/
├── css/
│   ├── light.css       # Light 테마 CSS Variables
│   └── dark.css        # Dark 테마 CSS Variables
├── js/
│   ├── light.js        # Light 테마 JavaScript
│   ├── light.d.ts      # Light 테마 TypeScript 타입
│   ├── dark.js
│   └── dark.d.ts
└── json/
    ├── light.json      # 디버깅용 JSON
    └── dark.json
```

### 5-2. 빌드 결과 확인

```bash
# 생성된 파일 확인
ls -la src/

# CSS 내용 확인 (선택사항)
cat src/css/light.css
```

**출력 예시 (light.css):**

```css
[data-theme="light"] {
  --core-color-primary-500: #0ea5e9;
  --core-color-gray-50: #f9fafb;
  --light-color-background-primary: #f9fafb;
  --light-color-text-primary: #111827;
  --light-color-action-primary-default: #0284c7;
  /* ... */
}
```

---

## 🔗 6. Next.js 프로젝트에서 사용하기

### 6-1. 의존성 추가

**파일:** `apps/page0127/package.json`

```json
{
  "dependencies": {
    "@repo/design-tokens": "*"
  }
}
```

- `"*"`: 모노레포 워크스페이스 내부 패키지는 버전 대신 `*` 사용
- npm install 시 자동으로 로컬 패키지로 심볼릭 링크 생성

### 6-2. Next.js 설정

**파일:** `apps/page0127/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모노레포 패키지의 CSS/JS 파일을 트랜스파일하도록 설정
  transpilePackages: ["@repo/design-tokens"],
};

export default nextConfig;
```

- `transpilePackages`: Next.js가 외부 패키지를 빌드 프로세스에 포함
- 설정하지 않으면 CSS import 시 에러 발생

### 6-3. TypeScript 타입 선언

**파일:** `apps/page0127/app/design-tokens.d.ts`

```typescript
// Design Tokens CSS 파일을 위한 TypeScript 타입 선언
declare module "@repo/design-tokens/css/light.css";
declare module "@repo/design-tokens/css/dark.css";
```

- TypeScript가 CSS 파일을 모듈로 인식하도록 선언
- `.d.ts` 파일: 타입 정의만 포함 (런타임 코드 없음)
- `app/` 디렉토리에 위치해야 전역 타입으로 인식됨

### 6-4. 모노레포 의존성 설치

**터미널에서 실행:** 프로젝트 루트에서 모노레포 전체 의존성 설치 (워크스페이스 링크 생성)

```bash
npm install
```

---

## 🎨 7. 컴포넌트에서 사용하기

### 7-1. CSS Variables 방식 (추천)

**파일:** `apps/page0127/app/test-tokens/page.tsx`

```tsx
// Design Tokens CSS import
import "@repo/design-tokens/css/light.css";

export default function TestTokensPage() {
  return (
    <div data-theme="light" className="min-h-screen p-8">
      {/* 배경색 사용 */}
      <div
        style={{
          backgroundColor: "var(--light-color-background-primary)",
          color: "var(--light-color-text-primary)",
        }}
      >
        <h1>Design Tokens 테스트</h1>
      </div>
    </div>
  );
}
```

- `import "@repo/design-tokens/css/light.css"`: CSS Variables 로드
- `var(--변수명)`: CSS Variable 참조
- `data-theme="light"`: 테마 선택자와 매칭

### 7-2. JavaScript 방식

```tsx
import tokens from "@repo/design-tokens/light";

export default function Page() {
  return (
    <div
      style={{
        backgroundColor: tokens.light.color.background.primary.value,
      }}
    >
      {/* ... */}
    </div>
  );
}
```

---

## 🔄 9. Figma 토큰 업데이트 워크플로우

### 9-1. Figma에서 토큰 Export

1. Figma에서 **Tokens Studio** 플러그인 실행
2. Tokens → Export → JSON 형식으로 다운로드
3. `packages/design-tokens/tokens/` 폴더에 파일 교체
   - `core.json`
   - `light.json`
   - `dark.json`

### 9-2. 토큰 재빌드

```bash
cd packages/design-tokens
npm run rebuild
```

### 9-3. 개발 서버 재시작

```bash
# Ctrl+C로 서버 중지 후
npm run dev
```

---

## 📚 핵심 개념 정리

### 모노레포 패키지 구조

```
project/
├── packages/
│   └── design-tokens/        # 독립적인 패키지
│       ├── tokens/           # 소스 (Git 추적)
│       ├── src/              # 빌드 결과물 (Git 제외)
│       └── package.json      # 패키지 메타데이터
└── apps/
    └── page0127/
        ├── package.json      # "@repo/design-tokens": "*"
        └── app/
```

### Style Dictionary 변환 과정

1. **입력:** JSON 토큰 파일

   ```json
   { "value": "{core.color.gray.50}", "type": "color" }
   ```

2. **참조 해석:** `{core.color.gray.50}` → `#f9fafb`

   - Style Dictionary가 자동으로 참조 해결

3. **출력:** 플랫폼별 파일 생성
   - CSS: `--light-color-background-primary: #f9fafb;`
   - JS: `{ value: "#f9fafb" }`
   - TypeScript: 타입 정의

### package.json exports 이해

```json
{
  "exports": {
    "./light": "./src/js/light.js", // JS import
    "./css/light.css": "./src/css/light.css" // CSS import (확장자 필수)
  }
}
```

**사용:**

```tsx
import tokens from "@repo/design-tokens/light"; // JS
import "@repo/design-tokens/css/light.css"; // CSS
```

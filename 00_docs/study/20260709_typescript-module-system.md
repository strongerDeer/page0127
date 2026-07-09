# TypeScript 모듈 시스템 — `esModuleInterop`과 `moduleResolution`

> 작성: 2026-07-09 | 계기: TypeScript 7.0 RC에서 `esModuleInterop: false`와 `moduleResolution: "node"`가 **삭제**됨.
> 목표: tsconfig의 이 두 옵션을 남에게 설명할 수 있게 되기.

---

## 0. 두 옵션은 서로 다른 질문에 답한다

헷갈리는 이유는 둘 다 "모듈" 얘기라서입니다. 하지만 답하는 질문이 다릅니다.

| 옵션 | 답하는 질문 | 시점 |
| --- | --- | --- |
| `moduleResolution` | `'react'`라는 **문자열**을 어느 **파일**로 볼 것인가? | 파일을 찾을 때 |
| `esModuleInterop` | 찾아낸 파일이 CommonJS면, `import x from` 을 어떻게 **동작**시킬 것인가? | 코드를 실행할 때 |

먼저 **찾고**(resolution), 그다음 **연결**한다(interop). 순서대로 보겠습니다.

---

# 1부. `esModuleInterop` — 왜 강제되는가

## 1-1. 문제의 뿌리: 두 모듈 시스템

JavaScript에는 역사적으로 두 가지 모듈 시스템이 있습니다.

```javascript
// CommonJS (CJS) — Node.js가 2009년부터 쓰던 방식
const express = require('express');
module.exports = something;

// ES Modules (ESM) — 2015년 언어 표준이 된 방식
import express from 'express';
export default something;
```

핵심 차이는 이겁니다.

**ESM에는 `default`라는 이름의 export가 명시적으로 존재합니다.** `export default foo`를 쓰면 그 모듈은 `default`라는 키를 가진 객체처럼 취급됩니다.

**CommonJS에는 `default` 개념이 아예 없습니다.** `module.exports = foo`는 그냥 "모듈 전체가 foo다"라는 뜻입니다.

## 1-2. 그래서 무슨 일이 생기나

Express는 대표적인 CommonJS 패키지입니다. 내부는 이렇게 생겼습니다.

```javascript
// node_modules/express/index.js (CommonJS)
module.exports = createApplication;  // 모듈 전체 = 함수 하나
```

이걸 TypeScript에서 `import`하려면 어떻게 해야 할까요?

### `esModuleInterop: false`였던 시절

```typescript
// ❌ 이렇게 쓰면 TS가 에러를 냅니다
import express from 'express';
// Module '"express"' has no default export.
```

당연합니다. `module.exports = fn`에는 `default` 키가 없으니까요. 그래서 옛날 코드에서는 이런 기괴한 문법을 썼습니다.

```typescript
// 😵 예전 방식 — 문법적으로는 통과하지만 개념이 깨져 있음
import * as express from 'express';
const app = express();  // 네임스페이스를 함수처럼 호출?!
```

`import * as X`는 **네임스페이스 객체**를 가져오는 문법입니다. ES 표준에 따르면 네임스페이스 객체는 **호출할 수 없습니다.** `express()`처럼 호출하는 건 스펙 위반입니다. TypeScript가 `module: "commonjs"`로 컴파일할 때만 눈감아줬던 거죠.

즉 `esModuleInterop: false`는 **표준을 어기는 코드를 쓰도록 강요**했습니다. 그 코드를 나중에 진짜 ESM 환경(브라우저, Node ESM, Vite)에 올리면 런타임에서 터집니다.

### `esModuleInterop: true`인 지금

```typescript
// ✅ 직관적이고, 표준에도 맞음
import express from 'express';
const app = express();
```

TypeScript가 컴파일할 때 **헬퍼 함수를 끼워 넣어서** 이 간극을 메웁니다.

```javascript
// tsc가 자동 생성하는 헬퍼 (개념적으로 이런 모양)
function __importDefault(mod) {
  // 원래 ESM이었으면 그대로, CJS였으면 { default: mod }로 감싼다
  return mod && mod.__esModule ? mod : { default: mod };
}

// import express from 'express' 는 이렇게 변환됨
const express_1 = __importDefault(require('express'));
const app = express_1.default();  // ← .default 로 접근
```

`__esModule: true`는 **"이 모듈은 원래 ESM이었다"는 표식**입니다. TypeScript나 Babel이 ESM을 CJS로 트랜스파일할 때 붙여줍니다. 이 표식이 있으면 그대로 쓰고, 없으면(= 순수 CJS면) `{ default: mod }`로 감싸는 겁니다.

## 1-3. `allowSyntheticDefaultImports`와 뭐가 다른가

이름이 비슷해서 헷갈리는 짝꿍입니다.

| 옵션 | 하는 일 |
| --- | --- |
| `allowSyntheticDefaultImports` | **타입 체커만** 조용히 시킴. 출력 코드는 안 바꿈. |
| `esModuleInterop` | 타입 체커도 조용히 시키고 + **실제 런타임 헬퍼까지 삽입.** |

`allowSyntheticDefaultImports`만 켜면 "타입은 통과하는데 런타임에 `undefined`"라는 최악의 상황이 생깁니다. 번들러가 알아서 interop을 처리해줄 때만 쓸모가 있습니다.

> `esModuleInterop: true`를 켜면 `allowSyntheticDefaultImports`는 자동으로 켜집니다. 따로 쓸 필요 없습니다.

## 1-4. 그래서 TS 7.0은 왜 `false`를 금지했나

세 가지 이유가 겹칩니다.

1. **`false`는 스펙 위반 코드를 생산합니다.** 호출 가능한 네임스페이스 객체는 ES 표준에 없습니다.
2. **런타임과 불일치합니다.** Node.js ESM, Vite, webpack, Turbopack 전부 표준 interop 규칙을 구현해뒀습니다. `false`로 컴파일한 코드는 이들 환경에서 다르게 동작합니다.
3. **유지 비용만 남았습니다.** 2026년에 새 프로젝트가 `false`를 켤 이유는 없습니다. 컴파일러를 Go로 다시 쓰면서 레거시 분기를 들고 갈 명분이 사라진 겁니다.

**한 줄 요약:** `esModuleInterop`은 *"`default`가 없는 CommonJS 모듈을, `default`가 있는 것처럼 안전하게 import하게 해주는 어댑터"*다.

---

# 2부. `moduleResolution` — `"bundler"` vs `"node"`

## 2-1. 모듈 해석(resolution)이란

```typescript
import { Button } from '@/shared/ui/Button';
import dayjs from 'dayjs';
```

컴파일러 입장에서 `'dayjs'`는 그냥 **문자열**입니다. 이 문자열을 실제 디스크의 어느 `.ts` / `.d.ts` 파일로 연결할지 결정하는 규칙 — 그게 모듈 해석입니다.

`moduleResolution`은 **"어떤 규칙집을 쓸 것인가"** 를 고르는 옵션입니다.

## 2-2. 규칙집 목록

### `"classic"` — 화석
TypeScript 초창기 방식. `node_modules`를 아예 안 봅니다. 오래전에 실질적으로 죽었고, TS 7.0에서 공식 삭제됩니다. 볼 일 없습니다.

### `"node"` (= `"node10"`) — 2009년의 Node.js
Node.js의 옛날 `require()` 알고리즘을 흉내 냅니다.

```
'dayjs' 를 만나면:
  1. ./node_modules/dayjs/package.json 의 "main" 필드를 본다
  2. 없으면 ./node_modules/dayjs/index.js 를 본다
  3. 못 찾으면 부모 디렉터리의 node_modules 로 올라가서 반복
```

**치명적 결함이 하나 있습니다. `package.json`의 `exports` 필드를 완전히 무시합니다.**

`exports`는 Node.js 12에서 도입된 필드로, 요즘 패키지는 거의 다 이걸 씁니다.

```jsonc
// 요즘 패키지의 package.json
{
  "main": "./dist/index.cjs",     // ← node10은 이것만 본다
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",   // ← 이걸 못 본다
      "import": "./dist/index.mjs",   // ← 이것도
      "require": "./dist/index.cjs"
    }
  }
}
```

그래서 `moduleResolution: "node"`로 요즘 패키지를 쓰면 이런 에러를 만납니다.

```
Cannot find module 'foo' or its corresponding type declarations.
```

**패키지는 멀쩡히 설치돼 있는데** 타입만 못 찾는 그 상황. 원인의 절반은 이겁니다. TS 7.0이 `node10`을 지운 이유이기도 합니다.

### `"node16"` / `"nodenext"` — 진짜 Node.js를 위한 것
현대 Node.js를 **정확히** 흉내 냅니다. `exports` 필드를 읽고, `package.json`의 `"type": "module"`로 CJS/ESM을 판별합니다.

대신 규칙이 엄격합니다. ESM 파일에서는 **상대 경로 import에 확장자가 필수**입니다.

```typescript
// nodenext 에서는 이렇게 써야 합니다 (소스가 .ts여도 .js로!)
import { helper } from './utils.js';
```

Node.js로 직접 실행하는 백엔드/CLI 도구에 적합합니다.

### `"bundler"` — 번들러를 쓸 때 (TS 5.0 도입)
**"어차피 Vite/webpack/Turbopack이 번들링할 건데, 걔들이 하는 대로 해석하자"** 는 발상입니다.

- `exports` 필드를 읽습니다 ✅ (node10의 결함 해결)
- 확장자를 생략할 수 있습니다 ✅ (nodenext의 엄격함 완화)
- `"type": "module"` 여부를 신경 쓰지 않습니다

즉 **node10의 편의성 + nodenext의 정확성**을 합친 것입니다. 번들러가 실제로 하는 일과 일치하기 때문에, 개발 중 타입 체크 결과와 빌드 결과가 어긋나지 않습니다.

## 2-3. 비교표

| | `node10` | `nodenext` | `bundler` |
| --- | --- | --- | --- |
| `exports` 필드 인식 | ❌ | ✅ | ✅ |
| 확장자 생략 (`'./utils'`) | ✅ | ❌ (필수) | ✅ |
| CJS/ESM 구분 강제 | ❌ | ✅ | ❌ |
| 언제 쓰나 | (쓰지 마세요) | Node로 직접 실행 | 번들러가 처리 |
| TS 7.0 | 🔥 **삭제됨** | 유지 | 유지 |

## 2-4. 왜 하필 우리는 `"bundler"`인가

[apps/page0127/tsconfig.json](../../apps/page0127/tsconfig.json)을 보면 이렇게 돼 있습니다.

```jsonc
{
  "moduleResolution": "bundler",
  "module": "esnext",
  "noEmit": true       // ← 여기가 핵심
}
```

`noEmit: true`는 **"tsc는 타입만 검사해라, 실제 JS 출력은 내가 안 시킨다"** 는 뜻입니다. 그럼 누가 JS를 만드느냐 — **Next.js의 Turbopack**입니다.

그러니 타입 체커도 Turbopack과 **같은 방식으로** 모듈을 찾아야 앞뒤가 맞습니다. 그래서 `bundler`입니다.

> `moduleResolution: "bundler"`를 쓰려면 `module`이 `"esnext"`나 `"preserve"`여야 합니다. `module: "commonjs"`와는 함께 쓸 수 없습니다.

**한 줄 요약:** `moduleResolution`은 *"import 문자열을 파일로 바꾸는 규칙집"* 이고, `"bundler"`는 *"번들러가 하는 방식 그대로"* 라는 뜻이다.

---

# 3부. TypeScript 7.0 대비 체크리스트

우리 레포를 기준으로 점검한 결과입니다.

### ✅ 이미 안전한 것

```jsonc
// apps/page0127/tsconfig.json
"moduleResolution": "bundler",  // node10 아님 ✅
"esModuleInterop": true,        // false 아님 ✅
// baseUrl 없이 paths만 사용    // baseUrl 삭제 대비 ✅
"strict": true                  // TS7 기본값과 일치 ✅
```

### ⚠️ 나중에 볼 것

**1. `types` 자동 로드 중단**

TS 7.0부터 `node_modules/@types/` 아래 패키지가 자동으로 전역에 들어오지 않습니다. 지금은 `types`를 명시 안 해도 다 들어오지만, 앞으로는 명시해야 합니다.

```jsonc
{
  "compilerOptions": {
    "types": ["node"]  // 전역 타입이 실제로 필요한 것만
  }
}
```

**2. `target: "ES2017"`**

삭제되는 건 `es5`뿐이라 당장 문제는 없습니다. 다만 React 19 + Next 16을 쓰는 프로젝트치고는 낮습니다. `ES2022` 정도가 적당합니다.

**3. [packages/icons](../../packages/icons/tsconfig.json)의 `bundler` + `declaration` 조합**

icons 패키지는 `noEmit`이 아니라 실제로 `.d.ts`를 **생성**합니다(`declaration: true`).

`bundler` 해석은 "번들러가 뒷수습해준다"는 전제가 깔려 있어서 확장자를 생략합니다. 그런데 그렇게 생성된 `.d.ts`를 `nodenext` 환경의 소비자가 읽으면 확장자가 없어서 깨질 수 있습니다.

지금은 모노레포 안에서만 소비하고 소비자([page0127](../../apps/page0127/tsconfig.json))도 `bundler`라 문제가 없습니다. **외부에 npm 배포할 일이 생기면** 그때 다시 보면 됩니다.

---

# 4부. 자가 진단

설명할 수 있으면 이해한 겁니다.

1. `import * as express from 'express'; express();` 이 코드가 왜 개념적으로 잘못됐나요?
2. `__esModule: true` 마커는 누가, 왜 붙이나요?
3. `allowSyntheticDefaultImports`만 켜고 `esModuleInterop`은 끄면 어떤 사고가 나나요?
4. 패키지가 설치돼 있는데 `Cannot find module 'foo' or its corresponding type declarations`가 뜹니다. `moduleResolution` 관점에서 첫 번째 의심 대상은?
5. 우리 프로젝트가 `nodenext`가 아니라 `bundler`인 이유를 `noEmit`과 엮어서 설명해보세요.

<details>
<summary>답 보기</summary>

1. `import * as X`는 **네임스페이스 객체**를 가져오는 문법이고, ES 표준상 네임스페이스 객체는 호출할 수 없습니다. `module: "commonjs"` + `esModuleInterop: false` 조합에서만 TS가 예외적으로 봐줬던 겁니다.
2. TypeScript나 Babel이 **ESM을 CJS로 트랜스파일할 때** 붙입니다. 런타임에 `__importDefault` 헬퍼가 "이게 원래 ESM이었는지(그럼 그대로 쓰고), 순수 CJS였는지(그럼 `{ default: mod }`로 감싸고)"를 판별하는 데 씁니다.
3. **타입 체크는 통과하는데 런타임에 `undefined`가 나옵니다.** `allowSyntheticDefaultImports`는 타입 체커만 조용히 시키고 실제 헬퍼 코드는 안 넣기 때문입니다.
4. `moduleResolution: "node"`(node10)입니다. 이 규칙집은 `package.json`의 `exports` 필드를 못 읽어서, `exports`로만 타입 경로를 노출하는 현대 패키지를 찾지 못합니다.
5. `noEmit: true`라서 tsc는 JS를 만들지 않고 타입만 검사합니다. 실제 번들링은 Turbopack이 합니다. 그러면 타입 체커도 Turbopack과 **같은 규칙으로** 모듈을 찾아야 결과가 일치합니다. 그게 `bundler`입니다.

</details>

---

## 참고

- [TypeScript 7.0 RC 발표](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/)
- [TypeScript Handbook — Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [TypeScript 5.0 — `moduleResolution: bundler`](https://www.typescriptlang.org/docs/handbook/modules/reference.html#bundler)

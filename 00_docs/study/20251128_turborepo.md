# Turborepo

## 1. Turborepo 설치 (devDependencies)

```bash
npm install turbo --save-dev

# apps 폴더 생성
mkdir -p apps/page0127
# packages 폴더 생성
mkdir -p packages
```

- `turbo`: Vercel이 만든 모노레포 빌드 시스템
- `--save-dev`: 개발 의존성으로 설치
- `mkdir -p`: 중첩된 폴더를 한 번에 생성 (-p는 부모 폴더도 자동 생성)

---

- `package.json`

```json
"workspaces": ["apps/*", "packages/*"],
"scripts": {
  "dev": "turbo run dev", // 모든 워크스페이스의 dev 스크립트를 병렬로 실행
  "build": "turbo run build" // Turborepo가 의존성 그래프를 분석해서 올바른 순서로 빌드
}
```

- workspaces:
  - npm이 apps/와 packages/ 폴더 내의 모든 프로젝트를 하나의 워크스페이스로 관리
  - 각 워크스페이스는 독립적인 package.json을 가지지만, 의존성은 루트에서 공유 가능

---

- `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "src/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "clean": {
      "cache": false
    },
    "rebuild": {
      "dependsOn": ["clean"],
      "outputs": [".next/**", "!.next/cache/**", "src/**"]
    }
  }
}
```

**주요 설정 설명:**

### pipeline
Turborepo가 어떤 작업을 어떻게 실행할지 정의

### build
- `dependsOn: ["^build"]`: 의존성이 있는 다른 패키지가 먼저 빌드되어야 함
- `outputs`: 캐싱할 결과물 지정
  - `.next/**`: Next.js 빌드 결과물
  - `!.next/cache/**`: 캐시 폴더는 제외
  - `src/**`: Style Dictionary 등의 빌드 결과물 (design-tokens 패키지)

### dev
- `cache: false`: 개발 서버는 캐싱하지 않음
- `persistent: true`: 백그라운드에서 계속 실행

### clean
- `cache: false`: 클린 작업은 캐싱하지 않음 (매번 실행)

### rebuild
- `dependsOn: ["clean"]`: clean 후 build 실행
- `outputs`: build와 동일한 결과물 캐싱

---

## 2. 모든 패키지에 스크립트 자동 적용

**장점:**
- 새 패키지 추가 시 루트 `package.json` 수정 불필요
- Turbo가 자동으로 모든 워크스페이스의 스크립트 감지
- 병렬 실행 + 캐싱으로 빠른 빌드

**사용 예시:**

```bash
# 모든 패키지의 build 스크립트 실행
npm run build

# 모든 패키지의 rebuild 스크립트 실행
npm run rebuild

# 특정 패키지만 실행하고 싶다면
npm run build --workspace=@repo/design-tokens
```

**작동 방식:**
1. `npm run build` 실행
2. Turbo가 `apps/*`와 `packages/*` 폴더 스캔
3. `package.json`에 `build` 스크립트가 있는 패키지만 실행
4. 의존성 그래프에 따라 순서 결정
5. 병렬 실행 가능한 패키지는 동시에 실행

---

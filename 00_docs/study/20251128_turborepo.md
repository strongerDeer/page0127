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
"pipeline": {
  "build": {
    "dependsOn": ["^build"],
    "outputs": [".next/**"]
  }
}
```

- pipeline: Turborepo가 어떤 작업을 어떻게 실행할지 정의
- dependsOn: 의존성 순서 (다른 패키지가 먼저 빌드되어야 함)
- outputs: 캐싱할 결과물 (.next 폴더)
- cache: 빌드 결과를 캐싱해서 변경된 부분만 다시 빌드

---

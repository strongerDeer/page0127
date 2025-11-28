# Playwright 학습 노트 (2025-11-25)

> **학습 목표:** Playwright를 사용한 웹 자동화 및 웹사이트 분석

---

## 📋 목차

1. [Playwright란?](#playwright란)
2. [Playwright MCP 설정하기](#playwright-mcp-설정하기)
3. [Playwright로 정보 크롤링 하기](#playwright로-정보-크롤링-하기)
4. [실습 프로젝트](#실습-프로젝트)

---

## Playwright란?

### 개요

**Playwright**는 Microsoft에서 개발한 오픈소스 브라우저 자동화 도구로, 웹 애플리케이션의 테스트와 자동화를 위한 강력한 프레임워크입니다.

### 주요 특징

- ✅ **크로스 브라우저**: Chromium, Firefox, WebKit (Safari) 지원
- ✅ **멀티 플랫폼**: Windows, macOS, Linux
- ✅ **자동 대기**: 요소가 준비될 때까지 자동으로 대기
- ✅ **강력한 선택자**: CSS, XPath, 텍스트, 역할(role) 기반
- ✅ **네트워크 제어**: API 모킹, 요청/응답 가로채기
- ✅ **스크린샷/비디오**: 자동 캡처 기능

### 사용 사례

1. **E2E 테스팅**: 웹 애플리케이션 자동 테스트
2. **웹 스크래핑**: 데이터 수집 및 분석
3. **웹사이트 분석**: UI/UX 분석, 경쟁사 조사
4. **반복 작업 자동화**: 루틴한 웹 작업 자동화

### 설치 방법

```bash
# npm 프로젝트 초기화
npm init -y

# Playwright 설치
npm install -D @playwright/test

# 브라우저 다운로드 (Chromium, Firefox, WebKit)
npx playwright install

# TypeScript 지원 (선택)
npm install --save-dev typescript @types/node
```

---

## Playwright MCP 설정하기

### 용어 설명: MCP란?

**MCP (Model Context Protocol)**는 AI 에이전트가 외부 도구나 데이터 소스에 접근할 수 있도록 하는 표준 프로토콜입니다.

#### MCP의 역할

- AI와 외부 시스템 간의 **표준화된 인터페이스** 제공
- 도구(Tool) 호출을 통한 **실시간 데이터 접근**
- **컨텍스트 공유**를 통한 더 나은 AI 응답

### Playwright 설정 파일

**playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", // 테스트 파일 디렉토리
  timeout: 180000, // 테스트 타임아웃 (3분)
  fullyParallel: true, // 병렬 실행

  use: {
    trace: "on-first-retry", // 실패 시 트레이스 기록
    screenshot: "only-on-failure", // 실패 시 스크린샷
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

### 주요 설정 옵션

| 옵션             | 설명               | 예시                            |
| ---------------- | ------------------ | ------------------------------- |
| `testDir`        | 테스트 파일 위치   | `'./tests'`                     |
| `timeout`        | 전역 타임아웃      | `180000` (3분)                  |
| `fullyParallel`  | 병렬 실행 여부     | `true`                          |
| `workers`        | 동시 실행 개수     | `4`                             |
| `use.trace`      | 추적 기록 시점     | `'on-first-retry'`              |
| `use.screenshot` | 스크린샷 캡처 시점 | `'only-on-failure'`             |
| `use.viewport`   | 뷰포트 크기        | `{ width: 1920, height: 1080 }` |

## 실습 프로젝트

- Google 검색 자동화
- 웹사이트 분석

---

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev/)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright GitHub](https://github.com/microsoft/playwright)
- [Playwright Discord](https://aka.ms/playwright/discord)

# 👤 사용자 프로필

- 경력: 3년차 프론트엔드 주니어 개발자
- 기술 스택: React, Next.js 기본 이해
- 학습 방식:
  - 터미널 명령어 직접 입력 (손으로 타이핑하며 학습)
  - 기본적인 코드는 자동 선호: 코드 주석으로 학습 포인트 설명
  - 단계별 이해하며 진행

# 🎯 Claude 행동 규칙

1. 학습 중심 접근

   - 앞서 나가지 말 것: 사용자가 요청하지 않은 기능 구현 금지
   - 터미널 명령어: 사용자가 직접 입력할 수 있도록 제시 (복사 붙여넣기용)
   - 코드 주석: 학습이 필요한 부분에 한국어 주석으로 설명
   - 기본 개념 설명: 3년차 개발자 수준에 맞춰 설명 (너무 기초적이거나 너무 고급이지 않게)

2. 코드 작성 원칙

   - Next.js
     - Server Component 우선: 기본적으로 Server Component로 구현
     - Client Component: 'use client' 필요 시에만 사용 (useState, useEffect, 이벤트 핸들러)
   - 기본 코드 자동 작성: 반복적이고 보일러플레이트 코드는 자동 작성
   - 학습 포인트만 주석: 중요한 개념이나 새로운 패턴에만 주석 추가

3. 진행 방식
   - 단계별 진행: 한 번에 하나씩 완성하며 진행
   - 확인 후 진행: 각 단계 완료 후 사용자 확인 대기

# ✅ 완료된 작업

1. Turborepo 모노레포 구조

   - npm install turbo --save-dev
   - package.json workspaces 설정
   - turbo.json 파이프라인 설정

2. Next.js 16 프로젝트 초기화
   - npx create-next-app@latest 실행
   - TypeScript + Tailwind CSS + App Router

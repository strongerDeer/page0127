#!/usr/bin/env bash
# Vercel "Ignored Build Step" — apps/page0127/vercel.json 의 ignoreCommand 가 부른다.
#
# 종료 코드가 거꾸로다: exit 0 = 빌드 건너뜀, exit 1 = 빌드한다.
#
# 왜 (2026-10-24):
#   Hobby 의 Functions Storage 한도(10GB)를 넘었다. 배포마다 함수 묶음이 저장되는데,
#   모든 브랜치·모든 푸시가 배포를 만들고 있었다 — 문서만 고친 커밋, dependabot 까지.
#   앱 결과물이 바뀌지 않는 배포는 만들지 않는다.
#
# 무엇을 앱 변경으로 보나:
#   apps/page0127 · packages/* · 루트 package.json·package-lock.json·turbo.json.
#   그 안에서도 테스트·스토리·문서(md)·e2e 는 빌드 결과에 안 들어가므로 뺀다.
#
# 같은 커밋을 다시 배포하면 빌드한다 (2026-11-01):
#   대시보드·API 의 Redeploy 는 보통 환경 변수(예: HERO_AB)를 바꾼 뒤 그 값을 반영하려고 한다.
#   코드가 같아도 환경 변수는 빌드 때 함수에 묶이므로, 건너뛰면 바꾼 값이 운영에 안 들어간다.
#   이 스크립트 자체가 바뀐 커밋도 빌드한다 — 안 그러면 이 규칙을 담은 커밋이 배포되지 않는다.
#
# 모르면 빌드한다 (fail-open):
#   비교할 이전 배포가 없거나(새 브랜치의 첫 푸시) 얕은 클론이라 그 커밋이 없으면 빌드한다.
#   빌드를 하나 더 하는 것은 비용이고, 필요한 배포를 빠뜨리는 것은 장애다.
#
# 로컬 확인:
#   VERCEL_GIT_COMMIT_REF=main VERCEL_GIT_PREVIOUS_SHA=<sha> bash scripts/vercel-ignore-build.sh; echo $?

set -u

BRANCH="${VERCEL_GIT_COMMIT_REF:-}"
PREVIOUS_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"

if [[ "$BRANCH" == dependabot/* ]]; then
  echo "dependabot 브랜치 — 미리보기를 만들지 않는다 (CI 가 검증한다)"
  exit 0
fi

# Claude 작업 브랜치도 미리보기를 만들지 않는다 (2026-11-03):
#   Functions Storage 는 "보관 중인 배포 수 × 배포 하나 크기(약 90MB)"다. 10/21~11/2 13일간
#   빌드된 배포 252개 중 147개가 미리보기였고, 거의 다 claude/* PR 푸시였다.
#   이 브랜치들의 화면 확인은 캡처(로컬·운영)로 하고, 검증은 CI 가 한다.
#   미리보기가 꼭 필요한 PR 은 claude/ 가 아닌 이름의 브랜치로 올리면 된다.
if [[ "$BRANCH" == claude/* ]]; then
  echo "Claude 작업 브랜치 — 미리보기를 만들지 않는다 (Functions Storage 절약, CI 가 검증한다)"
  exit 0
fi

if [[ -z "$PREVIOUS_SHA" ]]; then
  echo "이전 배포가 없다 — 빌드한다"
  exit 1
fi

COMMIT_SHA="${VERCEL_GIT_COMMIT_SHA:-}"
if [[ -n "$COMMIT_SHA" && "$PREVIOUS_SHA" == "$COMMIT_SHA" ]]; then
  echo "같은 커밋(${COMMIT_SHA:0:7})을 다시 배포한다 — 환경 변수 반영을 위해 빌드한다"
  exit 1
fi

cd "$(git rev-parse --show-toplevel)" || exit 1

if ! git cat-file -e "${PREVIOUS_SHA}^{commit}" 2>/dev/null; then
  echo "이전 배포 커밋(${PREVIOUS_SHA})이 클론에 없다 — 빌드한다"
  exit 1
fi

if git diff --quiet "$PREVIOUS_SHA" HEAD -- \
  apps/page0127 \
  packages \
  package.json \
  package-lock.json \
  turbo.json \
  scripts/vercel-ignore-build.sh \
  ':(exclude)**/*.test.ts' \
  ':(exclude)**/*.test.tsx' \
  ':(exclude)**/*.stories.tsx' \
  ':(exclude)**/*.md' \
  ':(exclude)apps/page0127/e2e'; then
  echo "${PREVIOUS_SHA:0:7}..HEAD 에 앱 변경이 없다 — 빌드를 건너뛴다"
  exit 0
fi

echo "앱 변경이 있다 — 빌드한다"
exit 1

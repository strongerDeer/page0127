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

if [[ -z "$PREVIOUS_SHA" ]]; then
  echo "이전 배포가 없다 — 빌드한다"
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

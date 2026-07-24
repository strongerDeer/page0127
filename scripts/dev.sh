#!/usr/bin/env bash
# page0127 로컬 개발 시작 스크립트
#   1) 로컬 Supabase(Docker) 기동 — config.toml의 env() 치환용으로 supabase/.env.local을 먼저 로드
#      (안 하면 Google OAuth client_id가 env(...) 리터럴로 나가 invalid_client 에러)
#   2) 앱 dev 서버 실행
#
# 사용: 프로젝트 어디서든  bash scripts/dev.sh   (또는 alias로 등록)
set -euo pipefail

# 스크립트 위치 기준으로 레포 루트를 찾는다(어디서 실행하든 동작).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 로컬 비밀값(Google OAuth 등) 로드 — 있으면 환경변수로 export
if [ -f supabase/.env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source supabase/.env.local
  set +a
  echo "✓ supabase/.env.local 로드됨"
fi

echo "▶ 로컬 Supabase 기동…"
supabase start

echo "▶ 앱 dev 서버 실행 (Ctrl+C로 종료)…"
cd apps/page0127
exec npm run dev

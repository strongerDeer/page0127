#!/usr/bin/env bash
# 운영 DB 주간 백업 — launchd(com.stronger.page0127-backup)가 매주 월요일과 로그인 시 부른다.
#
# 왜 로컬 Mac 에서 도나:
#   Supabase 조직이 free 플랜이라 자동 백업이 없다(Pro 전환 계획 없음).
#   GitHub Actions 로 돌리면 저장소가 public 이라 덤프(회원 이메일 포함)가 artifact 로 노출된다.
#
# 언제 건너뛰나:
#   최근 6일 안에 받은 백업이 있으면 아무것도 안 한다. 그래서 RunAtLoad(로그인 시)와
#   주간 예약을 함께 걸어도 한 주에 한 번만 받는다 — Mac 이 월요일에 꺼져 있었으면
#   다음 로그인 때 대신 받는다(launchd 는 꺼져 있던 동안의 예약을 다시 돌리지 않는다).
#
# 수동 실행:  bash scripts/backup-production-db.sh --force
set -euo pipefail

# 운영 프로젝트 ref. 링크가 개발 프로젝트로 바뀌어 있으면 **개발 DB를 받아 놓고 백업했다고
# 믿게 된다** — 에러 없이 조용히 틀리는 종류라 여기서 막는다.
PRODUCTION_REF='sjngwxtykqhlsvxcyqah'
BACKUP_DIR="${HOME}/page0127-backups"
ROOT="${PAGE0127_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TODAY="$(date +%Y%m%d)"
FORCE="${1:-}"

notify_failure() {
  # launchd 로 돌 때는 터미널이 없어 echo 를 아무도 못 본다. 알림 센터로 띄운다.
  osascript -e "display notification \"$1\" with title \"page0127 백업 실패\"" || true
  echo "✗ $1" >&2
  exit 1
}

mkdir -p "$BACKUP_DIR"

if [ "$FORCE" != '--force' ] && find "$BACKUP_DIR" -name 'data-*.sql' -mtime -6 | grep -q .; then
  echo "최근 6일 안의 백업이 있어 건너뜀"
  exit 0
fi

LINKED_REF="$(cat "$ROOT/supabase/.temp/project-ref" 2>/dev/null || true)"
if [ "$LINKED_REF" != "$PRODUCTION_REF" ]; then
  notify_failure "링크된 프로젝트가 운영이 아님(${LINKED_REF:-없음}). supabase link 확인"
fi

# supabase db dump 는 Docker 안의 pg_dump 를 쓴다. 꺼져 있으면 켜고 최대 2분 기다린다.
if ! docker info >/dev/null 2>&1; then
  open -a Docker
  for _ in $(seq 1 24); do
    sleep 5
    docker info >/dev/null 2>&1 && break
  done
  docker info >/dev/null 2>&1 || notify_failure 'Docker 가 2분 안에 켜지지 않음'
fi

SCHEMA_FILE="$BACKUP_DIR/schema-$TODAY.sql"
DATA_FILE="$BACKUP_DIR/data-$TODAY.sql"

supabase db dump --linked --workdir "$ROOT" -f "$SCHEMA_FILE" \
  || notify_failure '스키마 덤프 실패'
supabase db dump --linked --workdir "$ROOT" --data-only --use-copy -f "$DATA_FILE" \
  || notify_failure '데이터 덤프 실패'

# 파일이 생겼다고 성공이 아니다 — 인증이 끊기면 빈 파일이 남을 수 있다.
# profiles 는 가입자가 있는 한 항상 행이 있으므로 COPY 블록 존재로 판정한다.
grep -q 'COPY "public"."profiles"' "$DATA_FILE" \
  || notify_failure "데이터 덤프에 profiles 가 없음 — $DATA_FILE 확인"

TABLES="$(grep -c '^COPY ' "$DATA_FILE")"
echo "✓ 백업 완료 — $DATA_FILE (테이블 ${TABLES}개)"

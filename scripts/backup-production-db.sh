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
# 왜 설치본을 따로 두나 (2026-10-01 실제 발생):
#   macOS 는 ~/Desktop 을 보호 폴더로 취급해, launchd 가 띄운 bash 가 저장소 안의 이 파일을
#   읽으려 하면 "Operation not permitted" 로 막는다. 그래서 launchd 는 Desktop 밖의 설치본
#   (~/.page0127-backup/scripts/)을 부르고, 덤프에 필요한 링크 정보(supabase/.temp)도
#   그 옆에 복사해 둔다. **이 파일을 고치면 --install 을 다시 돌려야 설치본에 반영된다.**
#
# 설치(최초 1회·수정 후):  bash scripts/backup-production-db.sh --install
# 수동 실행:               bash scripts/backup-production-db.sh --force
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

if [ "$FORCE" = '--install' ]; then
  # 설치본 위치. 스크립트를 scripts/ 아래에 두어 설치본에서도 ROOT(= 한 단계 위)가
  # 그대로 링크 정보가 있는 폴더를 가리키게 한다.
  INSTALL_DIR="${HOME}/.page0127-backup"
  mkdir -p "$INSTALL_DIR/scripts" "$INSTALL_DIR/supabase/.temp"
  cp "${BASH_SOURCE[0]}" "$INSTALL_DIR/scripts/backup-production-db.sh"
  # project-ref 만으로는 부족하다 — pooler-url 이 없으면 IPv6 직결을 시도하다 실패한다.
  cp "$ROOT/supabase/.temp/project-ref" "$ROOT/supabase/.temp/pooler-url" \
    "$ROOT/supabase/.temp/postgres-version" "$ROOT/supabase/.temp/linked-project.json" \
    "$INSTALL_DIR/supabase/.temp/"
  echo "✓ 설치 완료 — $INSTALL_DIR"
  exit 0
fi

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

# 임시 파일에 받고, 검사를 통과한 뒤에만 정식 이름으로 옮긴다.
# 2026-10-01 launchd 실행에서 "Dumped schema" 를 출력하고도 스키마 파일이 0바이트로 남아
# 같은 날 받아 둔 정상 백업을 덮어썼다. 빈 덤프가 좋은 백업을 지우면 백업이 없느니만 못하다.
SCHEMA_TMP="$(mktemp "$BACKUP_DIR/.schema-XXXXXX")"
DATA_TMP="$(mktemp "$BACKUP_DIR/.data-XXXXXX")"
trap 'rm -f "$SCHEMA_TMP" "$DATA_TMP"' EXIT

# 덤프 한 번 = "명령 성공 + 내용 검사 통과". 둘 중 하나라도 실패하면 잠시 쉬고 다시 받는다.
#
# 왜 재시도하나 (2026-10-01 하루에 세 번):
#   supabase CLI 는 명령마다 임시 로그인 역할(cli_login_postgres)의 비밀번호를 새로 만드는데,
#   연달아 부르면 풀러에 반영되기 전에 접속해 `password authentication failed` 로 실패한다.
#   몇십 초 뒤 다시 부르면 통과했다. 주 1회 백업이 이 운에 걸려 한 주를 통째로 비우지 않게 한다.
# 왜 내용까지 보나:
#   종료 코드 0 인데 0바이트 파일이 남은 적이 있다. 파일이 생겼다고 성공이 아니다.
#   스키마는 profiles 정의, 데이터는 profiles 의 COPY 블록(가입자가 있는 한 항상 있다)으로 판정한다.
DUMP_ATTEMPTS=3
DUMP_RETRY_WAIT="${DUMP_RETRY_WAIT:-30}"

dump_with_retry() {
  local file="$1" must_contain="$2"
  shift 2
  for attempt in $(seq 1 "$DUMP_ATTEMPTS"); do
    if supabase db dump --linked --workdir "$ROOT" -f "$file" "$@" && grep -q "$must_contain" "$file"; then
      return 0
    fi
    if [ "$attempt" -lt "$DUMP_ATTEMPTS" ]; then
      echo "  덤프 실패(${attempt}/${DUMP_ATTEMPTS}) — ${DUMP_RETRY_WAIT}초 뒤 다시 시도" >&2
      sleep "$DUMP_RETRY_WAIT"
    fi
  done
  return 1
}

dump_with_retry "$SCHEMA_TMP" 'CREATE TABLE IF NOT EXISTS "public"."profiles"' \
  || notify_failure "스키마 덤프 ${DUMP_ATTEMPTS}회 실패 — 기존 백업은 그대로 둠"
dump_with_retry "$DATA_TMP" 'COPY "public"."profiles"' --data-only --use-copy \
  || notify_failure "데이터 덤프 ${DUMP_ATTEMPTS}회 실패 — 기존 백업은 그대로 둠"

mv "$SCHEMA_TMP" "$SCHEMA_FILE"
mv "$DATA_TMP" "$DATA_FILE"

TABLES="$(grep -c '^COPY ' "$DATA_FILE")"
echo "✓ 백업 완료 — $DATA_FILE (테이블 ${TABLES}개)"

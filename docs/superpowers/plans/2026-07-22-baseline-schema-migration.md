# 베이스라인 스키마 마이그레이션 (books/profiles/comments/activities) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **예외:** Task 1(로그인/링크)은 사용자 계정 인증이 필요해 에이전트가 대신 실행할 수 없다. 이 태스크는 사용자가 직접 터미널에 명령어를 입력해야 하며, 완료 후에만 Task 2부터 진행 가능하다.

**Goal:** Supabase 대시보드에서 직접 생성되어 마이그레이션 이력에 없는 4개 핵심 테이블(`books`, `profiles`, `comments`, `activities`)의 실제 스키마와 RLS 정책을 `supabase db pull`로 추출해, 버전관리되는 baseline 마이그레이션 파일로 편입시킨다.

**Architecture:** Supabase CLI의 `db pull`은 로컬 마이그레이션 히스토리와 원격 DB의 실제 스키마를 비교(diff)해서, 로컬에 없는 객체(테이블, 컬럼, 정책, 인덱스, 함수 등)를 새 마이그레이션 파일로 자동 생성한다. 이 파일을 커밋하면 `supabase db reset`만으로 DB 전체를 처음부터 재현할 수 있고, RLS 정책도 파일로 감사 가능해진다.

**Tech Stack:** Supabase CLI (npx 경유, 로컬 글로벌 설치 없음), PostgreSQL, 기존 `supabase/migrations/` 디렉토리

## Global Constraints

- 원격 프로덕션 DB에 절대 쓰기 작업을 하지 않는다. `db pull`/`db diff --linked`는 읽기 전용이며, 이 작업 범위에서 `db push`, `db reset --linked` 등 원격에 쓰는 명령은 사용 금지.
- 로그인(`supabase login`)과 프로젝트 링크(`supabase link`)는 사용자 계정 인증이 필요하므로 반드시 사용자가 자신의 터미널에서 직접 실행한다.
- `.env.local`, DB 비밀번호, 서비스 롤 키 등 민감정보는 마이그레이션 파일이나 커밋 메시지에 절대 포함하지 않는다.
- 프로젝트 ref: `sjngwxtykqhlsvxcyqah` (`NEXT_PUBLIC_SUPABASE_URL`에서 확인된 공개 정보)
- 대상은 `books`/`profiles`/`comments`/`activities` 4개지만, `db pull`은 로컬에 없는 모든 원격 객체를 잡아낸다 (예: `activity_comments`도 같은 문제로 확인됨). 범위를 억지로 4개로 제한하지 말고 diff 결과를 그대로 받아들인다.

---

### Task 1: Supabase CLI 로그인 및 프로젝트 링크 (사용자 직접 실행)

**Files:** 없음 (로컬 CLI 인증/링크 상태만 변경)

- [ ] **Step 1: Supabase CLI 로그인**

터미널에 입력 (브라우저가 열리며 로그인 진행):
```bash
npx supabase login
```
예상 결과: 브라우저 인증 완료 후 터미널에 `You are now logged in.` 메시지.

- [ ] **Step 2: 프로젝트 루트에서 원격 프로젝트 링크**

```bash
cd /Users/dreamfulbud/Desktop/stronger/0127
npx supabase link --project-ref sjngwxtykqhlsvxcyqah
```
예상 결과: DB 비밀번호 입력 프롬프트 → 입력 후 `Finished supabase link.` 메시지.

- [ ] **Step 3: 링크 확인**

```bash
npx supabase projects list
```
예상 결과: 해당 프로젝트 옆에 `● Linked` 표시.

---

### Task 2: 원격 스키마 diff를 마이그레이션 파일로 pull

**Files:**
- Create: `supabase/migrations/<timestamp>_remote_schema.sql` (CLI가 자동 생성)

- [ ] **Step 1: dry-run으로 차이 먼저 확인**

```bash
npx supabase db diff --linked --schema public
```
예상 결과: `books`, `profiles`, `comments`, `activities` 등 로컬 마이그레이션에 없는 테이블의 `CREATE TABLE` 문이 터미널에 출력됨 (파일 생성 없이 미리보기만).

- [ ] **Step 2: 실제로 pull하여 마이그레이션 파일 생성**

```bash
npx supabase db pull
```
예상 결과: `supabase/migrations/`에 `<timestamp>_remote_schema.sql` 파일이 새로 생성되고, `Schema written to supabase/migrations/..._remote_schema.sql` 메시지 출력.

- [ ] **Step 3: 생성된 파일 확인**

```bash
ls -la supabase/migrations/*remote_schema*
```

---

### Task 3: 누락 테이블/RLS 포함 여부 검증

**Files:**
- Read: `supabase/migrations/<timestamp>_remote_schema.sql`

- [ ] **Step 1: 4개 핵심 테이블의 CREATE TABLE 포함 여부 확인**

```bash
grep -n "CREATE TABLE" supabase/migrations/*_remote_schema.sql
```
예상 결과: `books`, `profiles`, `comments`, `activities` 4개 모두 목록에 나타남.

- [ ] **Step 2: RLS 활성화/정책 포함 여부 확인**

```bash
grep -nE "ENABLE ROW LEVEL SECURITY|CREATE POLICY" supabase/migrations/*_remote_schema.sql | grep -E "\bbooks\b|\bprofiles\b|\bcomments\b|\bactivities\b"
```
예상 결과: 4개 테이블 각각에 대해 `ENABLE ROW LEVEL SECURITY`와 최소 1개 이상의 `CREATE POLICY`가 존재.

- [ ] **Step 3: 누락분 확인 시 대시보드 대조**

Step 1~2에서 특정 테이블/정책이 비어 있으면 Supabase 대시보드 → Database → Tables/Policies에서 실제 정의를 확인하고, 그 내용을 그대로 옮겨 추가 마이그레이션 파일(`supabase/migrations/<다음 timestamp>_backfill_missing_rls.sql`)로 작성한다. (구체 SQL은 실제 누락분이 확인된 뒤 확정)

---

### Task 4: 로컬 재현 테스트 (Docker 필요)

**Files:** 없음 (검증만)

- [ ] **Step 1: 로컬 Supabase 스택 시작**

```bash
npx supabase start
```
예상 결과: 로컬 Postgres/Studio 컨테이너 기동. 첫 실행 시 이미지 다운로드로 수 분 소요될 수 있음.

- [ ] **Step 2: 마이그레이션만으로 로컬 DB 완전 재생성**

```bash
npx supabase db reset
```
예상 결과: 에러 없이 모든 마이그레이션이 순서대로 적용되고 `Finished supabase db reset` 메시지 출력. 이 명령이 에러 없이 끝나면 "DB를 처음부터 재현할 수 없다"는 문제가 해결된 것.

- [ ] **Step 3: 로컬(재현본)과 마이그레이션 파일 사이에 남은 diff 없는지 확인**

```bash
npx supabase db diff --schema public
```
예상 결과: 출력 없음 (diff 없음 = 마이그레이션 파일만으로 완전히 재현됨).

- [ ] **Step 4: 로컬 스택 정리**

```bash
npx supabase stop
```

---

### Task 5: 커밋

**Files:**
- Add: `supabase/migrations/<timestamp>_remote_schema.sql`
- (Task 3에서 보완이 있었다면) Add: `supabase/migrations/<timestamp>_backfill_missing_rls.sql`

- [ ] **Step 1: 변경사항 확인**

```bash
git status
git diff --stat supabase/migrations/
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/
git commit -m "chore: 대시보드에서 직접 생성된 books/profiles/comments/activities 테이블을 baseline 마이그레이션으로 편입"
```

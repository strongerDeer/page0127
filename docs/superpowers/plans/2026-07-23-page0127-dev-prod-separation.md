# page0127 로컬 개발 환경 분리 (로컬 Supabase) — 실행 계획

> **For agentic workers:** 대시보드/CLI를 사람이 조작하는 운영 런북. 사용자 학습 스타일상 **터미널 명령은 사용자가 직접 입력**한다(복붙용으로 제시). Claude는 명령·값·순서·검증을 짚는다.

**Goal:** 로컬 개발이 **내 컴퓨터 안의 로컬 Supabase(Docker)** 에 붙게 해서, 로컬 실험이 운영 데이터를 절대 건드리지 않게 한다.

**Architecture:** `supabase start`가 Docker로 Postgres/Auth/Storage/Studio를 띄우고 `supabase/migrations/`를 자동 적용한다. 로컬 `.env.local`을 로컬 Supabase 주소·키로 바꾼다. CI·Vercel Preview는 이번 범위 밖(당분간 운영 유지).

**Tech Stack:** Supabase CLI 2.109.1, Docker(설치·실행 확인됨), Next.js 16.

## Global Constraints
- 커밋 메시지에 `Co-Authored-By` 트레일러 **금지**.
- 동시 작업이 있으니 커밋 전 `git status`로 **내 변경만** 스테이징.
- `.env.local`은 git 미추적 → **커밋되지 않음**(로컬에서만 수정).
- 로컬 값은 비밀 아님(로컬 Supabase의 anon/service 키는 공개된 데모 키). 운영 값과 혼동 금지.
- 이번 범위: **로컬만** 분리. CI·Preview는 운영 유지(다음 라운드).

---

### Task 1: 로컬 Supabase 기동 (마이그레이션 자동 적용)

**Files:** 사용/확인: `supabase/config.toml`, `supabase/migrations/*.sql`

- [ ] **Step 1 [사용자]: 로컬 스택 기동**

```bash
supabase start
```
- 첫 실행은 Docker 이미지 다운로드로 **수 분** 걸림(1회성).
- 끝나면 API URL·anon key·service_role key 등을 출력한다.

- [ ] **Step 2 [사용자→Claude]: 접속 정보 확인·공유**

```bash
supabase status
```
출력의 다음 값을 Claude에게 알려주세요(로컬 키라 민감하지 않음):
- `API URL` (기대: `http://127.0.0.1:54321`)
- `anon key`
- `service_role key`
- `Studio URL` (기대: `http://127.0.0.1:54323`)

- [ ] **Step 3 [함께]: 마이그레이션 적용 검증**

`supabase start`가 migrations를 자동 적용한다. 확인:
- [사용자] Studio(`http://127.0.0.1:54323`) → Table Editor에 `books`, `profiles`, `activities` 등 테이블 존재 확인
- (데이터는 비어 있는 게 정상 — seed 없음)

**Verify:** 로컬 Supabase가 떠 있고, 운영과 동일한 테이블 스키마가 로컬에 존재.

---

### Task 2: 로컬 `.env.local`을 로컬 Supabase로 전환

**Files:** Modify: `apps/page0127/.env.local` (미추적 — 커밋 안 됨)

- [ ] **Step 1 [사용자]: Supabase 3종을 로컬 값으로 교체**

`apps/page0127/.env.local`에서 아래 3개를 로컬 값으로:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase status의 anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase status의 service_role key>
```
- 나머지 값(OpenAI, 알라딘 등)은 그대로 둠.
- **운영 값은 따로 백업**(메모장 등)해 두면 나중에 되돌리기 쉬움.

- [ ] **Step 2 [Claude]: URL이 로컬인지 검증(키는 미출력)**

```bash
cd apps/page0127
grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local   # 기대: http://127.0.0.1:54321
```

- [ ] **Step 3 [사용자]: 앱을 로컬 DB로 실행**

```bash
npm run dev
```
브라우저에서 앱이 뜨는지 확인(로컬 DB라 목록은 비어 보일 수 있음 — 정상).

**Verify:** 로컬 앱이 `127.0.0.1:54321`(로컬 Supabase)에 연결됨. 운영 DB 미접속.

---

### Task 3: 확인·주의사항·마무리

- [ ] **Step 1 [함께]: 분리 확인**

- 로컬에서 데이터 만들고 지워도 운영 대시보드엔 변화 없음(원하면 한 번 테스트).

- [ ] **Step 2 [Claude 안내]: 알아둘 한계**

- **구글 로그인(OAuth)은 로컬에서 기본 동작 안 함** — 로컬 Supabase Auth엔 Google이 설정 안 돼 있음. 로컬에서 인증 흐름을 테스트하려면 이메일 로그인 사용 또는 별도 설정 필요.
- 로컬 스택은 컴퓨터/도커 재시작하면 꺼짐. 다시 쓰려면 `supabase start`.
- 스키마를 초기화하며 마이그레이션 재적용: `supabase db reset` (로컬 데이터 삭제됨, 로컬 한정).
- 다 쓰면 자원 회수: `supabase stop`.

- [ ] **Step 3 [사용자]: 개발 종료 시(선택)**

```bash
supabase stop
```

- [ ] **Step 4 [Claude]: (선택) `.env.example`에 로컬 개발 안내 주석 추가 후 커밋**

`.env.example`에 "로컬 개발은 `supabase start` 후 로컬 URL/키 사용" 한 줄 추가 → 내 변경만 스테이징해 커밋.

**Verify:** 로컬 개발이 로컬 Supabase로 완전 분리됨. 운영은 무영향.

---

## 다음 라운드(범위 밖, 나중에)
- CI·Vercel Preview까지 분리하려면: 클라우드 개발 프로젝트(무료 2번째, 단 미사용 시 정지) 또는 Pro의 Supabase Branching.
- `main` 직접 push 차단(branch protection)·PR 강제.

## Self-Review 메모
- 축소 목표(로컬만 분리) 완전 커버: 기동(Task1)→배선(Task2)→확인/한계(Task3).
- CI/Preview·branch protection은 명시적으로 다음 라운드로 분리.
- 로컬 키가 비밀이 아니라는 점, `.env.local` 미커밋, 운영 값 백업을 Global Constraints·Task2에 명시.

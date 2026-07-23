# page0127 개발/운영 환경 분리 — 실행 계획

> **For agentic workers:** 이 계획은 코드 TDD가 아니라 **대시보드·CLI를 사람이 조작하는 운영 런북**이다. 각 단계는 `[사용자]`(대시보드/비밀값 입력) / `[Claude]`(명령·검증·git) / `[함께]`로 표시한다. Claude는 Supabase/Vercel 대시보드에 접근할 수 없으므로, 사용자가 조작하고 Claude가 정확한 값·명령·순서를 짚고 각 단계 끝에서 **검증**한다.

**Goal:** `main`은 운영 Supabase, `develop`·PR·로컬·CI는 새 개발 Supabase를 보도록 환경을 분리한다.

**Architecture:** Vercel이 브랜치로 환경을 구분(main→Production, 그 외→Preview)하고, 환경변수를 Production/Preview 두 벌로 둔다. `NEXT_PUBLIC_*`는 빌드 시점에 박히므로 각 배포가 자기 환경 값으로 빌드된다. 개발 Supabase는 로컬·CI·Preview가 공유한다.

**Tech Stack:** Supabase CLI 2.109.1, Vercel, GitHub Actions, Next.js 16.

## Global Constraints

- 커밋 메시지에 `Co-Authored-By` 트레일러 **금지**.
- 동시 작업이 있으니 커밋 전 `git status`로 **내 변경만** 스테이징.
- 분리 대상 "Supabase 3종": `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- 운영 프로젝트 ref = `sjngwxtykqhlsvxcyqah` (링크 원복·구분용).
- **안전 최우선**: 어떤 마이그레이션/DB 명령도 운영에 실수로 적용 금지. `db push` 전 링크된 ref가 개발인지 반드시 확인.
- Vercel 환경변수를 바꾸면 **재배포해야** 빌드에 반영된다.

---

### Task 1: 개발용 Supabase 프로젝트 생성 + 마이그레이션 적용

**Files:**
- 사용/확인: `supabase/migrations/*.sql`, `supabase/.temp/project-ref`

- [ ] **Step 1 [사용자]: 개발 프로젝트 생성**

Supabase 대시보드 → New project → 이름 `page0127-dev` (region은 운영과 같게 권장) → **Database Password를 정하고 꼭 기록**. 생성 완료까지 1~2분 대기.

- [ ] **Step 2 [사용자→Claude에 공유]: 새 프로젝트 값 4개 확보**

대시보드 → Settings → API 및 General에서:
- Project **ref** (URL의 `https://<ref>.supabase.co`의 `<ref>` 부분)
- `Project URL`
- `anon` `public` 키
- `service_role` 키

→ ref만 먼저 알려주세요(URL/키는 뒤 단계에서 사용). **여기서 값을 채팅에 붙일 때, service_role 키는 민감하니 주의.**

- [ ] **Step 3 [Claude]: 로그인·현재 링크 확인 (안전 게이트)**

```bash
supabase projects list >/dev/null 2>&1 || supabase login   # 로그인 안 돼 있으면 로그인
cat supabase/.temp/project-ref                              # 기대: sjngwxtykqhlsvxcyqah (운영)
```
기대 출력: 운영 ref. (지금 운영에 링크된 상태 확인)

- [ ] **Step 4 [함께]: 개발 프로젝트로 재링크**

```bash
supabase link --project-ref <DEV_REF>   # <DEV_REF> = Step 2의 개발 ref
# → Database Password 입력 프롬프트: Step 1에서 정한 개발 비번 입력
```

- [ ] **Step 5 [Claude]: 링크가 개발로 바뀐 것 확인 (⚠️ 이게 안전 게이트의 핵심)**

```bash
cat supabase/.temp/project-ref   # 반드시 <DEV_REF> 여야 함
```
기대: `<DEV_REF>`. **만약 운영 ref(sjngw…)가 나오면 즉시 중단** — 다음 push가 운영을 건드린다.

- [ ] **Step 6 [함께]: 마이그레이션을 개발에 적용**

```bash
supabase db push
# → 적용될 마이그레이션 목록 출력 + "Do you want to push these migrations...?" → y
```
기대: ~20개 마이그레이션이 순서대로 적용되고 성공.

- [ ] **Step 7 [Claude]: 적용 검증**

```bash
supabase db push        # 재실행 → "Remote database is up to date." 나오면 정상
```
또는 [사용자] 대시보드 → Table Editor에서 `books`, `profiles`, `activities` 등 테이블 존재 확인.

- [ ] **Step 8 [Claude]: 운영으로 링크 원복 (일상 상태 복귀)**

```bash
supabase link --project-ref sjngwxtykqhlsvxcyqah
cat supabase/.temp/project-ref   # 기대: sjngwxtykqhlsvxcyqah (운영)
```

**Verify(Task 1 완료 기준):** 개발 프로젝트에 운영과 동일한 테이블이 존재하고, 로컬 링크는 다시 운영으로 원복됨. (코드/커밋 변경 없음 — 이 Task는 인프라 준비)

---

### Task 2: `develop` 브랜치 생성 & push

**Files:** (git 브랜치만; 파일 변경 없음)

- [ ] **Step 1 [Claude]: 작업 트리 정리 상태 확인**

```bash
git status -sb    # 내가 만든 미커밋 변경이 없는지(또는 무관한 동시작업만 있는지) 확인
git branch --show-current   # 기대: main
```

- [ ] **Step 2 [Claude]: main 최신화 후 develop 생성**

```bash
git fetch origin
git switch main
git branch develop origin/main   # origin/main 기준으로 develop 생성
```

- [ ] **Step 3 [사용자]: develop push (외부 동작이라 사용자가 실행)**

```bash
git push -u origin develop
```

- [ ] **Step 4 [함께]: 검증**

- `git branch -r` → `origin/develop` 보임
- [사용자] Vercel 대시보드 → Deployments에 `develop` 브랜치의 **Preview** 배포가 생성/빌드되는지 확인

**Verify:** `origin/develop` 존재 + Vercel이 develop에 대해 Preview 배포를 인식.

---

### Task 3: Vercel 환경변수 — Preview = 개발

**Files:** (Vercel 대시보드 설정; 저장소 변경 없음)

- [ ] **Step 1 [사용자]: Production Branch 확인**

Vercel → 프로젝트 → Settings → Git → Production Branch가 `main`인지 확인(아니면 `main`으로).

- [ ] **Step 2 [사용자]: Preview 환경변수에 개발 값 설정**

Vercel → Settings → Environment Variables. 아래 3개 각각에서 **Preview** 스코프 값 = 개발 프로젝트 값으로 설정(Production 스코프는 운영 값 그대로 유지):
- `NEXT_PUBLIC_SUPABASE_URL` → 개발 Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → 개발 anon 키
- `SUPABASE_SERVICE_ROLE_KEY` → 개발 service_role 키

- [ ] **Step 3 [사용자]: 외부 키도 Preview에 값 채움(재사용)**

`OPENAI_API_KEY`, `ALADIN_API_KEY`의 Preview 스코프에 운영과 같은 값(또는 유효한 값)을 넣어 Preview 기능이 동작하게 함. (`CRON_SECRET`은 Preview 불필요)

- [ ] **Step 4 [사용자]: develop 재배포 (env 반영)**

Vercel → Deployments → 최신 develop 배포 → **Redeploy** (환경변수는 재빌드해야 박힘).

- [ ] **Step 5 [함께]: 검증 — Preview가 개발 DB에 붙는지**

- [사용자] develop Preview URL(`...-git-develop-...vercel.app`) 접속 → 앱이 정상 렌더
- 개발 DB는 비어 있으므로 목록류는 비어 보일 수 있음(정상). 로그인 페이지·문의 페이지 등 공개 페이지가 뜨면 OK.
- (선택) 개발 프로젝트에서 회원가입/데이터 한 건 만들어 보고, Preview에만 보이고 운영엔 없으면 분리 성공.

**Verify:** develop Preview가 정상 배포되고 **개발 Supabase**에 연결됨. 운영 데이터에는 영향 없음.

---

### Task 4: 로컬 + CI를 개발로 전환

**Files:**
- Modify: `apps/page0127/.env.local` (git 미추적 — 커밋 안 됨)
- 확인: `.github/workflows/ci.yml`(변경 없음, secret 값만 대시보드에서 교체)

- [ ] **Step 1 [사용자]: 로컬 `.env.local`의 Supabase 3종을 개발 값으로 교체**

`apps/page0127/.env.local`에서:
```
NEXT_PUBLIC_SUPABASE_URL=<개발 Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<개발 anon 키>
SUPABASE_SERVICE_ROLE_KEY=<개발 service_role 키>
```
(다른 값은 그대로 둠)

- [ ] **Step 2 [Claude]: 로컬이 개발 DB에 붙는지 검증**

```bash
cd apps/page0127
grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local   # 개발 URL인지 확인(키는 확인 안 함)
```
그리고 [사용자] `npm run dev` 후 앱이 뜨고, 개발 DB(빈 상태) 기준으로 동작하는지 확인.

- [ ] **Step 3 [사용자]: GitHub Actions secret 2개를 개발 값으로 교체**

리포 → Settings → Secrets and variables → Actions → Repository secrets:
- `NEXT_PUBLIC_SUPABASE_URL` → 개발 URL로 **Update**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → 개발 anon 키로 **Update**

(CI 스모크는 service_role을 안 쓰므로 그 secret은 불필요)

- [ ] **Step 4 [함께]: CI 재실행으로 검증**

`develop`에 사소한 커밋을 push하거나 Actions에서 최신 CI run을 **Re-run** → `E2E smoke` job이 여전히 **초록불**(이제 개발 DB 대상)인지 확인.
- 개발 DB에 마이그레이션이 적용돼 테이블이 있으므로, 랜딩/미들웨어 렌더가 정상 → 스모크 통과 기대.

**Verify:** 로컬·CI 모두 개발 Supabase를 사용하고, CI E2E는 초록불 유지.

---

### Task 5: 최종 점검 & 마무리

**Files:**
- (선택) Modify: `apps/page0127/.env.example` — 환경 분리 안내 주석 1~2줄

- [ ] **Step 1 [함께]: 성공 기준 체크리스트 확인**

- [ ] 로컬 `npm run dev` → 개발 DB
- [ ] CI `E2E smoke` → 초록불(개발 DB)
- [ ] `develop` Preview → 개발 DB로 정상 배포
- [ ] `main` Production → 운영 DB, 영향 없음
- [ ] 개발/테스트 어떤 행위도 운영 데이터 미변경

- [ ] **Step 2 [Claude]: (선택) `.env.example`에 환경 안내 주석 추가 후 커밋**

`.env.example` 상단 주석에 "로컬·CI·Preview는 개발 Supabase, Production만 운영" 한 줄 추가.
```bash
git add apps/page0127/.env.example
git commit -m "docs(env): 개발/운영 Supabase 분리 안내 주석 추가"
```

- [ ] **Step 3 [Claude]: 다음 라운드 안내**

이 계획에서 제외한 **main 직접 push 차단(branch protection)·PR 강제**는 별도 spec/계획으로 진행(“운영에 막 push 못 하게”의 강제화).

**Verify:** 위 체크리스트가 모두 충족되면 데이터 환경 분리 완료.

---

## Self-Review 메모
- Spec의 4개 셋업 단계(개발 Supabase/마이그레이션 → develop → Vercel Preview → 로컬·CI) 모두 Task 1~4로 커버됨. 성공 기준·위험요소는 Task 5·각 Verify에 반영.
- 제외 범위(branch protection, custom 도메인, 시드, 외부키 완전 분리)는 Task 5 Step 3에서 다음 라운드로 명시.
- 안전 게이트(링크 ref 확인)는 Task 1 Step 3·5·8에 배치.

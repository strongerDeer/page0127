# page0127 개발/운영 환경 분리 — 설계 문서

- 작성일: 2026-07-23
- 범위: **데이터(Supabase) 환경 분리 + 연결 배선**까지 (배포 워크플로우 강제는 다음 라운드)

## 1. 목표와 배경

### 지금 문제
현재 Supabase 프로젝트가 **운영 하나뿐**이고, 로컬 개발·CI 테스트·배포된 사이트가 **전부 그 운영 DB에 붙어 있다**.

```
[운영 Supabase]  ← 로컬 개발 + CI 테스트 + 배포된 사이트   (전부 여기)
```

- 로컬 `.env.local` → `https://sjngwxtykqhlsvxcyqah.supabase.co` (운영)
- CI GitHub secret → 운영
- Vercel → main push 시 곧바로 운영 배포

즉 테스트/개발 행위가 운영 데이터를 건드릴 수 있고, main에 push하면 검증 없이 바로 손님에게 나간다.

### 이번에 달성할 것
```
[운영 Supabase] ← main(Production) 만
[개발 Supabase] ← develop·PR(Preview) + 로컬 + CI 테스트   (새로 만듦)
```
"운영이 아닌 모든 것"은 **개발 Supabase**를 보게 만든다.

## 2. 아키텍처 — 브랜치로 환경을 가른다

Vercel은 **브랜치**로 배포 환경을 자동 구분한다. 환경변수는 **브랜치별이 아니라 "환경별(Production / Preview)"로 한 번씩** 설정한다.

| 브랜치 | Vercel 환경 | 사용하는 Supabase |
|---|---|---|
| `main` | Production | 운영 |
| `develop` + 그 외 모든 브랜치·PR | Preview | 개발 |

- Production 환경변수 → 운영 값
- Preview 환경변수 → 개발 값

결과:
```
main    → Production 빌드 → 운영 Supabase
develop → Preview 빌드    → 개발 Supabase   ✅
PR들    → Preview 빌드    → 개발 Supabase   ✅
로컬                       → 개발 Supabase   ✅
CI 테스트                  → 개발 Supabase   ✅
```

`develop`은 Vercel이 `프로젝트-git-develop-계정.vercel.app` 형태의 **고정 미리보기 URL**을 자동으로 준다 → 개발용 사이트로 사용.

> ⚠️ 핵심 원리: `NEXT_PUBLIC_*` 값은 **빌드 시점에 번들에 박힌다.** 그래서 각 배포(Production/Preview)가 자기 환경의 값으로 각각 빌드된다 → 코드 변경 없이 환경별로 다른 Supabase에 붙는다.

## 3. 연결 지점(배선) — Before / After

| 연결 지점 | 지금 | 목표 |
|---|---|---|
| 로컬 `.env.local` | 운영 | **개발** |
| GitHub Actions secret (CI 테스트) | 운영 | **개발** |
| Vercel — Production env | 운영 | 운영 (그대로) |
| Vercel — Preview env | (미설정/운영) | **개발** |

분리 대상 값(“Supabase 3종”):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

외부 API 키(`OPENAI_API_KEY`, `ALADIN_API_KEY`)는 환경별 데이터가 아니므로 **당분간 Preview에도 운영과 같은 값 재사용**(또는 CI에선 dummy). `CRON_SECRET`은 Vercel 크론이 Production에서만 도므로 Preview에선 불필요.

## 4. 셋업 단계 (누가 무엇을)

> 대시보드 클릭은 **사용자**, 정확한 값·명령어·순서·git/secret 반영은 **Claude가 짚어준다.** Claude는 Supabase/Vercel 대시보드에 접근할 수 없다.

### 단계 1 — 개발용 Supabase 프로젝트 + 마이그레이션
1. Supabase 대시보드에서 새 프로젝트 생성 (예: `page0127-dev`)
2. 새 프로젝트의 URL / anon key / service_role key 확보
3. `supabase/migrations/`의 마이그레이션을 **개발 프로젝트에** 적용 (Supabase CLI)
   - ⚠️ **안전장치**: 적용 전 반드시 "지금 링크된 프로젝트가 개발용인지" 확인. 운영에 실수로 적용/리셋 금지. (정확한 명령·확인 절차는 실행 계획에서 확정)
4. 개발 프로젝트에 테이블이 생겼는지 확인 (빈 데이터로 시작 — 스모크 테스트엔 충분)

### 단계 2 — `develop` 브랜치 생성
- `main`에서 `develop` 브랜치를 만들어 push → Vercel이 Preview 배포를 자동 인식

### 단계 3 — Vercel Preview 환경변수 = 개발
- Vercel 프로젝트 → Settings → Environment Variables
- Supabase 3종의 **Preview** 스코프 값을 **개발 프로젝트 값**으로 설정 (Production 스코프는 운영 그대로)
- 외부 API 키는 Preview에도 값 채움(재사용)
- Git 설정에서 Production Branch = `main` 확인
- 값 반영 후 재배포해야 빌드에 반영됨(NEXT_PUBLIC 특성)

### 단계 4 — 로컬 + CI를 개발로
- 로컬 `.env.local`: Supabase 3종을 개발 값으로 교체
- GitHub Actions repository secret: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 개발 값으로 갱신 (이미 등록돼 있는 두 개를 교체)

## 5. 성공 기준 (검증)
- [ ] 로컬 `npm run dev`가 **개발 DB**에 붙는다 (운영 데이터가 안 보임/안 바뀜)
- [ ] CI의 `E2E smoke` job이 여전히 초록불 (이제 개발 DB 대상)
- [ ] `develop` push → Vercel Preview 배포가 뜨고, 개발 DB에 연결돼 정상 렌더
- [ ] `main`(Production) 배포는 그대로 운영 DB, 영향 없음
- [ ] 개발/테스트 어떤 행위도 **운영 데이터를 건드리지 않음**

## 6. 범위에서 제외 (다음 라운드)
- **main 직접 push 차단 / PR 강제** (branch protection, 리뷰 필수) — "운영에 막 push 못 하게"의 강제화. **다음 spec.**
- Vercel Custom Environment + 전용 도메인(`dev.내사이트.com`)
- 개발 DB 시드(seed) 데이터
- 외부 API 키·Sentry의 환경별 완전 분리 (지금은 재사용)

## 7. 위험 요소와 대비
- **마이그레이션을 엉뚱한(운영) 프로젝트에 적용** → 링크된 프로젝트 ref를 매 단계 확인, 운영 대상 `db reset`류 금지
- **NEXT_PUBLIC은 빌드 타임에 박힘** → Vercel 값 바꾼 뒤 반드시 재배포로 반영
- **Preview에 service_role 누락** → 서버 기능이 Preview에서 실패 → 3종 모두 Preview에 설정
- **CI가 개발 DB로 바뀐 뒤 스모크 실패** → 개발 DB에 마이그레이션이 적용됐는지 먼저 확인(빈 테이블이라도 존재해야 함)

## 8. 롤백
- Vercel/secret/`.env.local` 값을 운영으로 되돌리면 즉시 원복 (코드 변경이 거의 없어 위험 낮음)
- `develop` 브랜치는 삭제해도 무방

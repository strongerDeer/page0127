# page0127 품질 모니터링 대시보드 (+ GA 골격) 설계

> 작성일: 2026-07-24
> 상태: 설계 승인 대기 → 구현 계획 전환 예정

## 1. 개요 / 목표

page0127에 **품질 모니터링 대시보드**를 추가한다. 예전 프로젝트 `novera/shop-chart`의
품질 측정 시스템(`scripts/quality/`)을 page0127 맥락에 맞게 **패키지로 포팅**하고, admin
콘솔에서 결과를 시각화한다.

핵심 목표:

- 배포된 page0127 공개 페이지의 **성능·접근성·SEO·모범사례**를 주기적으로 측정하고,
  주차 간 추세로 **"개선되는 부분"을 파악**한다.
- 실사용자가 아직 없어도(솔로 단계) **지금 당장 가치가 나오는** 내부 도구를 먼저 갖춘다.
- 베타 테스터 모집 시점을 대비해 **GA 유입·행동 분석 대시보드의 골격**(라우트/레이아웃/네비)을
  미리 깔아두되, 데이터 연결은 다음 라운드로 미룬다.

## 2. 배경

### 2.1 재사용 자산: `novera/shop-chart`

`scripts/quality/`에 이미 검증된 품질 측정 시스템이 존재한다:

- **Lighthouse** — 성능·접근성·모범사례·SEO 4개 카테고리 + Core Web Vitals, 모바일/데스크탑
  두 폼팩터, 반복 측정 후 중앙값(`LH_RUNS`, 기본 3회)
- **CrUX** — Chrome UX Report API로 실사용자 28일·75분위 필드 지표 + History API로 25주 추세
- **전송바이트(weight)** — 페이지 총/이미지/스크립트 전송 바이트. 타이밍 지표보다 노이즈가 적은
  안정 지표
- **코드 건강도 / 번들** — 운영 배포 ref를 체크아웃해 번들을 분석(`build.ts`, `prodCheckout.ts`)
- **SEO 정적 체크** — `node-html-parser`로 메타/OG/canonical 등 검사
- **회귀 판정** — 직전 레코드 대비 성능·번들·CWV 악화 감지(`analyze.ts`)
- **리포트** — 마크다운 리포트 자동 생성(`report.ts`)
- **저장** — JSON 파일 2개(`quality-metrics.json` 주간 스냅샷, `quality-field-history.json`
  CrUX 추세)에 누적
- **실행** — 로컬 launchd로 주 1회, 순수 로컬(CI 미사용)

이 시스템은 문서화가 매우 충실하다(`scripts/quality/README.md`). 랩 수치와 실사용자 수치를
구분하는 판정 철학, 앵커 페이지 선정 이유, CrUX 결측 처리 함정 등 도메인 지식이 코드/주석에
녹아 있으므로 **최대한 원형을 보존해 포팅**한다.

### 2.2 page0127 현황

- **모노레포**: Turborepo + npm workspaces(`apps/*`, `packages/*`), 패키지는 `@repo/*` 스코프
- **앱**: Next.js 16, FSD 구조, Supabase 백엔드, Vercel 배포(크론 사용 중)
- **GA**: 이미 설치됨(`src/shared/lib/analytics/GoogleAnalytics.tsx`, `trackEvent.ts`,
  `@vercel/analytics`, `NEXT_PUBLIC_GA_ID`)
- **admin 콘솔**: `app/(admin)/admin/` 아래 costs·banners·members. `assertAdmin()`으로
  페이지 게이트, `AdminNav` 위젯으로 좌측 네비
- **공개 라우트**: `/`, `/about`, `/books/all`, `/[username]`, `/[username]/[bookId]` 등

## 3. 범위

### 3.1 이번 라운드 (In Scope)

1. `@repo/quality` 패키지 — shop-chart 품질 시스템 **전체 포팅**(코드건강·회귀판정·리포트 포함),
   page0127 맞춤 조정
2. Supabase 스키마 — 측정 결과 저장 테이블 2개 + RLS
3. GitHub Actions 워크플로우 — 주 1회 자동 + 수동 dispatch 측정, Supabase 저장
4. `/admin/quality` — 측정 결과 시각화 페이지
5. `/admin/analytics` — GA 대시보드 **골격**(레이아웃·탭·플레이스홀더만)
6. `AdminNav`에 "품질" / "유입분석" 링크 추가

### 3.2 명시적 비범위 (Out of Scope — 다음 라운드)

- GA 실제 데이터 연결(유입/국가·지역/검색어/인기·이탈/기기·연령·성별 등) — 골격만 깔고 데이터는
  베타 트래픽이 쌓인 뒤
- Search Console(SEO 검색어·노출·클릭) 데이터 연결
- CrUX 실사용자 데이터의 유의미한 축적(트래픽 부족으로 당분간 빈 값 — 코드는 지금 포팅하되
  값은 베타 후 채워짐)

## 4. 아키텍처 & 데이터 흐름

```
GitHub Actions (주 1회 cron + workflow_dispatch)
  └─ node --experimental-strip-types 로 @repo/quality 실행 (Chrome 포함 러너)
       ├─ Lighthouse   성능·접근성·모범사례·SEO (모바일+데스크탑, 앵커 페이지)
       ├─ CrUX API     실사용자 필드 + 25주 추세  (베타 전까진 빈 값)
       ├─ SEO 정적체크  메타/OG/canonical 등
       ├─ 전송바이트    번들·이미지 무게
       ├─ 코드건강      현재 커밋 빌드 분석 (page0127 자기 자신 → prodRef 불필요)
       ├─ 회귀 판정     직전 레코드 대비
       └─ 리포트(md)   생성
  └─ 결과를 Supabase에 upsert (service_role 키 = GitHub Secret)

Supabase (2개 테이블)          page0127 admin (Vercel, 서버 컴포넌트)
  quality_records         ──▶   /admin/quality   ← 읽어서 recharts 시각화
  quality_field_history   ──▶   /admin/analytics ← GA 골격(빈 껍데기)
```

**설계 원칙**: 측정(무겁고 Chrome 필요, CI에서)과 표시(admin, DB 읽기만)를 완전히 분리한다.
Lighthouse는 실제 Chrome이 필요해 Vercel 서버리스에서 돌릴 수 없다는 제약이 이 구조를 강제한다.
CrUX·Search Console은 순수 API 호출이라 어디서든 되지만, Lighthouse 때문에 CI 러너에 함께 둔다.

## 5. `@repo/quality` 패키지 설계

`packages/quality/`에 shop-chart의 `scripts/quality/` 파일을 포팅한다. 기존 `@repo/design-tokens`
패키지 구조(`package.json` `@repo/*` 스코프)를 따른다.

### 5.1 포팅 대상 (원형 보존)

| 파일 | 역할 |
| --- | --- |
| `types.ts` | 측정 결과 타입(그대로) |
| `config.ts` | 앱/앵커/회귀 임계/폼팩터 설정 (**page0127용으로 교체**) |
| `runtime.ts` | 런타임 측정 헬퍼 |
| `lighthouse.ts` | Lighthouse 측정 + 중앙값 |
| `crux.ts` | CrUX 필드 + History |
| `seo.ts` | SEO 정적 체크 |
| `build.ts` | 번들/코드건강 측정 (**현재 커밋 대상으로 단순화**) |
| `analyze.ts` | 회귀 판정 |
| `report.ts` | 마크다운 리포트 생성 (**저장 대상 조정**) |
| `store.ts` | 결과 저장 (**JSON → Supabase로 교체**) |
| `run.ts` | 오케스트레이션 엔트리포인트 |
| `*.test.ts` | vitest 테스트 함께 포팅 |

### 5.2 page0127 맞춤 조정 3곳

1. **`store.ts`: JSON 파일 → Supabase upsert**
   - `@supabase/supabase-js`로 service_role 클라이언트 생성(`SUPABASE_URL`,
     `SUPABASE_SERVICE_ROLE_KEY`)
   - `appendRecord` → `quality_records`에 insert
   - `saveFieldHistory` → `quality_field_history`에 `period_end` 기준 upsert(병합)
   - `readHistory` → 직전 레코드 조회(회귀 판정용)

2. **`config.ts`: page0127 앵커로 교체**
   - shop 별도 repo 체크아웃(`repoPath: '../shop'`, `prodRef: 'origin/release/*'`,
     `prodCheckout.ts`) **삭제** — page0127은 측정 대상이 자기 repo라 CI 체크아웃 커밋을 그대로
     빌드/측정하면 된다. `prodCheckout.ts`는 포팅에서 제외.
   - 측정 대상 base URL은 `QUALITY_TARGET_URL` 환경변수로 주입(로컬 검증 시 로컬,
     CI에서는 배포 URL). shop-chart의 `targetUrl`에 해당.
   - 앵커 페이지(§10.1) 반영.

3. **`report.ts`: 외부 로그 폴더 발행 → 레코드에 저장**
   - shop-chart는 `@team/frontend/logs/`에 md 파일을 썼다. page0127은 리포트 md 문자열을
     `quality_records.report_md`에 함께 저장한다.
   - (선택) 워크플로우가 `docs/quality/` 아래에 md를 커밋하는 것은 구현 6단계에서 결정.

### 5.3 런타임

shop-chart와 동일하게 `node --experimental-strip-types`로 실행한다(relative import는 `.ts`
확장자 필수, tsx는 Lighthouse를 깨뜨려 사용 안 함). `LH_RUNS`(기본 3), `LH_FORM_FACTORS`(기본
`mobile,desktop`) 환경변수를 유지한다.

## 6. Supabase 스키마 (마이그레이션 1개)

파일명: `supabase/migrations/20260724HHMMSS_create_quality_tables.sql`
(HHMMSS는 생성 시각으로 확정)

```sql
-- 주간 스냅샷 (append)
create table public.quality_records (
  id            uuid primary key default gen_random_uuid(),
  measured_at   timestamptz not null default now(),
  git_ref       text,
  form_factors  text[] not null,        -- ['mobile','desktop']
  record        jsonb not null,         -- pages/cwv/weight/field/regressions 통째
  report_md     text,
  schema_version int not null default 1
);

-- CrUX 25주 추세 (period_end 기준 upsert 병합)
create table public.quality_field_history (
  period_end        date not null,
  metric            text not null,      -- 'lcp'|'inp'|'cls'|'fcp'|'ttfb'
  period_start      date not null,
  p75               double precision,
  good              double precision,
  needs_improvement double precision,
  poor              double precision,
  primary key (period_end, metric)
);
```

- **저장 형태 결정**: `quality_records.record`는 jsonb 통짜 저장. shop-chart의 타입 구조
  (`QualityRecord`/`PageMetrics`/`FieldMetrics`/`WeightMetrics`)를 그대로 담아 포팅 리스크를
  최소화한다. 시각화 쪽은 동일 타입을 공유해 읽는다. (승인된 결정 — 정규화 대신 jsonb)
- **field_history만 약간 정규화**: `period_end` 기준 upsert 병합이 필요해
  `(period_end, metric)` 복합 PK로 둔다.
- **RLS**:
  - 두 테이블 모두 RLS 활성화, `select`는 admin에게만 허용(기존 admin 판별 방식 재사용).
  - 쓰기는 CI의 service_role 키가 담당하며 service_role은 RLS를 우회한다(별도 insert 정책
    불필요).

## 7. GitHub Actions 워크플로우

파일: `.github/workflows/quality.yml`

- **트리거**: `schedule`(주 1회, 예 `0 0 * * 1` = 월 09:00 KST) + `workflow_dispatch`(수동)
- **러너**: `ubuntu-latest`(Chrome 사전 설치됨) — `chrome-launcher`가 시스템 Chrome 사용
- **단계**:
  1. checkout
  2. Node 설치 + `npm ci`
  3. page0127 빌드(코드건강/번들 측정 대상)
  4. `@repo/quality`의 `run.ts` 실행
  5. 결과는 스크립트가 직접 Supabase에 저장(별도 아티팩트 커밋 없음)
- **시크릿/환경변수**(GitHub Secrets):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — 결과 저장용
  - `CRUX_API_KEY` — CrUX(없으면 필드 지표만 생략, 측정은 계속)
  - `QUALITY_TARGET_URL` — 측정 대상 배포 URL
- **주의**: shop-chart는 로컬 launchd였다. CI로 옮기므로 Mac 전원과 무관하게 돌고, 베타 대비로
  견고하다.

## 8. `/admin/quality` 시각화

FSD에 맞춰 `src/features/admin-quality/`(데이터 조회·표현 로직) + `app/(admin)/admin/quality/`
(라우트, 서버 컴포넌트)로 구성. 차트는 shop-chart처럼 `recharts`.

화면 구성(위→아래):

1. **최신 요약 RAG 카드** — 실사용자 CWV(LCP·INP·CLS) 합격/불합격 + 랩 점수(성능·접근성·SEO·
   모범사례). shop-chart의 판정 철학 유지: 실사용자 CWV·랩 TBT·전송바이트·코드건강은 RAG로
   판정, **랩 LCP는 중립(회색)** 처리(느린4G LCP는 회선 속도를 재는 값이라 코드 신호가 약함).
2. **페이지별 점수 테이블** — 앵커별 4개 카테고리 점수 + CWV, 모바일/데스크탑 폼팩터 토글.
   폼팩터가 다른 값을 맞대어 비교하지 않도록 토글로 분리.
3. **CrUX 25주 추세 차트** — LCP/INP/CLS의 good 비율 시계열. 결측은 `connectNulls={false}`로
   점만 표시(INP는 값 있는 주가 적음).
4. **회귀 배너** — 직전 대비 회귀 감지 시 상단 경고.
5. **리포트 md 렌더** — `react-markdown`으로 `report_md` 표시.

데이터는 서버 컴포넌트에서 Supabase로부터 최신 `quality_records` 1건 + `quality_field_history`
전체를 읽어 내려준다. `assertAdmin()` 게이트는 `(admin)` 레이아웃이 이미 담당.

## 9. `/admin/analytics` GA 골격

`app/(admin)/admin/analytics/`에 레이아웃 + 탭만 구성하고, 각 탭은 "데이터 연결 예정"
플레이스홀더로 둔다. 탭 구성(다음 라운드에 채울 자리):

- **유입** (소스/매체/캠페인)
- **국가·지역** (국가별, 시/군/구별)
- **검색어** (Search Console)
- **인기·이탈 페이지**
- **방문 품질** (기기·브라우저·해상도·OS·성별·연령·방문패턴·요일)

이 골격은 IA(정보구조)를 미리 고정해, 다음 라운드에서 데이터 소스만 각 탭에 연결하면 되게 한다.

## 10. 설정값

### 10.1 측정 앵커 (page0127 공개 페이지)

shop-chart 교훈대로 "인기 페이지"가 아니라 **회귀 감지용 고정 URL**이다. 같은 URL을 계속 재야
코드 변경 영향을 주차 간 비교로 잡는다. 실사용자 대표성은 CrUX가 담당한다.

| name | path | 성격 |
| --- | --- | --- |
| home | `/` | 랜딩 |
| about | `/about` | 정적 소개 |
| library | `/books/all` | 목록/그리드 템플릿 |
| profile | `/dreamfulbud` | 동적 사용자 페이지 |
| detail | `/dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54` | 무거운 동적 상세(최적화 효과 잘 드러남) |

### 10.2 주기·폼팩터

- 주 1회(월 09:00 KST) + 수동 dispatch
- `LH_RUNS=3` 중앙값, 폼팩터 `mobile,desktop` 모두

### 10.3 회귀 임계

shop-chart의 `REGRESSION` 값을 초기값으로 그대로 사용하고(성능 -8점, 번들 +10%, 전송바이트
+15%, LCP/TBT 최소 회귀폭 등), page0127 실측 노이즈를 보며 이후 조정한다.

## 11. 보안 / 시크릿

- **service_role 키는 CI에서만 사용**하고 GitHub Secret으로 보관. 클라이언트/브라우저에 절대
  노출하지 않는다(admin 페이지는 anon+RLS로 읽는다).
- `quality_records`/`quality_field_history`의 `select` RLS를 admin으로 제한해, 비-admin이
  품질 데이터를 못 읽게 한다.
- `CRUX_API_KEY`는 `?key=`로만 쓰이며(shop-chart 주석대로 OAuth Bearer는 400), 없으면 필드
  지표만 건너뛰고 측정은 계속된다.

## 12. 구현 순서 (우선순위)

1. `@repo/quality` 스캐폴드 + shop-chart 코어 포팅 → **로컬 JSON로 먼저 동작 검증**
   (Supabase 붙이기 전에 측정 자체가 도는지 확인)
2. Supabase 스키마 마이그레이션 + `store.ts`를 Supabase로 전환
3. GitHub Actions 워크플로우(주 1회 + 수동)
4. `/admin/quality` 시각화
5. `AdminNav` + `/admin/analytics` 골격
6. (선택) 코드건강·리포트 `docs/quality/` 커밋 여부 결정

## 13. 성공 기준

- CI(또는 로컬)에서 `@repo/quality`를 실행하면 5개 앵커의 Lighthouse·전송바이트·SEO·(가능시
  CrUX) 측정이 완료되고 Supabase에 레코드가 쌓인다.
- `/admin/quality`에서 최신 스냅샷 요약·페이지별 점수·(데이터 있으면)CrUX 추세·회귀·리포트를
  admin이 볼 수 있다.
- 2주 이상 측정이 누적되면 회귀 판정과 추세가 동작한다.
- `/admin/analytics` 골격이 네비에 노출되고, 탭 IA가 자리 잡는다.

## 14. 리스크 / 열린 이슈

- **CrUX 빈 값**: 솔로 단계라 CrUX는 origin 폴백에서도 데이터가 없을 가능성이 높다. 코드는
  `undefined`를 정상 처리하므로 측정은 진행되고, UI는 "데이터 없음"을 명확히 표시해야 한다.
- **앵커 URL 안정성**: `detail` 앵커의 bookId가 삭제되면 측정이 404가 된다. 삭제 위험 낮은
  레코드로 골랐으나, 사라지면 config에서 교체한다(시계열은 그 페이지만 끊김).
- **`QUALITY_TARGET_URL`**: 배포 URL 값은 워크플로우 설정 시점에 GitHub 변수로 주입한다.
- **CI 측정 시간**: 5개 앵커 × 2폼팩터 × 3회 = 30 Lighthouse 실행. 러너 시간이 길어질 수
  있어, 필요 시 `LH_RUNS`·폼팩터를 조정한다.

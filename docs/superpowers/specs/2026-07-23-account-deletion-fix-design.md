# 계정 삭제 재설계 — 설계 문서

- 작성일: 2026-07-23
- 대상: `apps/page0127/app/api/auth/account/route.ts` (DELETE)
- 배경: 오픈 전 필수 수정 항목 ① — "계정 탈퇴가 실제 계정을 삭제하지 않음"

## 문제 정의

현재 `DELETE /api/auth/account`는 다음 문제를 가진다.

1. **`auth.users` 미삭제**: `profiles`와 일부 테이블만 지운 뒤 `auth.users`는 남겨두면서
   `계정이 삭제되었습니다`(200)를 반환한다. 실제 계정은 살아 있다.
2. **삭제 순서 버그**: `taste_analyses`를 먼저 삭제한 뒤, 그 `taste_analyses`를 다시 조회해
   `book_recommendations`를 지운다. 이미 지웠으므로 조회 결과가 비어 `book_recommendations`는
   영영 삭제되지 않는다.
3. **비원자성**: 중간 실패를 `console.error`만 남기고 계속 진행 → "반쯤 삭제된 계정" 발생 가능.
4. **권한 부족**: 일반(쿠키/RLS) 클라이언트로 삭제 → `auth.users` 삭제 권한이 없다.
5. **개인정보처리방침 불일치**: `privacy/page.tsx`의 "탈퇴하면 즉시 삭제 / 모든 데이터가 지워집니다"
   문구와 실제 동작이 어긋난다.

## 핵심 발견: DB가 이미 올바른 삭제를 하도록 설정돼 있음

마이그레이션의 외래키(FK)를 전수 확인한 결과, 사용자 데이터는 다음과 같이 연결돼 있다.

- **`auth.users(id) ON DELETE CASCADE`**: `books`, `activities`, `notifications`(user_id·actor_id),
  `follows`, `taste_analyses`, `compatibility_analyses`, `mutual_recommendations`,
  `book_likes`, `ai_usage_logs`, `profiles`
- **자식 테이블도 부모를 통해 CASCADE**: `book_recommendations`←`taste_analyses`,
  `mutual_recommendations`←`compatibility_analyses`, `comments`/`activity_comments`←`activities`
- **`comments` / `activity_comments`의 `user_id`만 `ON DELETE SET NULL`**:
  댓글은 지우지 않고 작성자만 비워 "탈퇴한 사용자"로 보존 (커뮤니티 보호)

전수 확인 결과 `auth.users`를 참조하는 모든 FK가 `ON DELETE CASCADE` 또는 `SET NULL`을 명시하고 있어,
`auth.users` 행 하나를 삭제하면 DB가 **단일 트랜잭션으로** 딸린 데이터를 전부 삭제하고 댓글은
작성자만 비운다. 이것이 정확히 의도한 동작이다.

즉 현재 route의 수동 삭제 100여 줄은 DB가 이미 하는 일을 손으로 다시 하다가 순서까지 틀린 것이며,
정작 마지막 `auth.users` 삭제는 빠져 있었다.

## 선택한 접근: FK CASCADE 신뢰 (Approach A)

`admin.auth.admin.deleteUser(user.id)` 한 번으로 DB CASCADE가 전부 처리하게 한다.
DB 관련 데이터만 별도로 정리하고, DB 밖 자원(Storage 이미지)만 애플리케이션에서 직접 정리한다.

대안(참고):
- **B. DB RPC 트랜잭션 + deleteUser**: 삭제를 SECURITY DEFINER 함수에 명시. FK CASCADE와 중복이라 채택 안 함.
- **C. 현행 유지 + 버그만 패치**: 비원자적이고 100줄이 그대로 남아 FK와 중복. 채택 안 함.

## 처리 흐름

```
DELETE /api/auth/account
 1. 쿠키 세션 클라이언트로 getUser()      → 없으면 401 (본인 확인)
 2. admin 클라이언트(service_role) 생성
 3. profiles에서 photo_url 조회            ← 삭제 "전에" 이미지 경로 확보
 4. admin.auth.admin.deleteUser(user.id)
      · 성공 → DB가 CASCADE로 딸린 데이터 전부 삭제 + comments SET NULL
      · 실패 → 500 반환, "삭제됨" 메시지 금지
 5. photo_url 있으면 Storage 이미지 삭제   (best-effort, 실패해도 200)
 6. 200 "계정이 삭제되었습니다."
```

## 핵심 결정

- **인증은 쿠키 클라이언트, 삭제는 admin 클라이언트**: "본인인지"는 세션으로 확인하고,
  실제 `auth.users` 삭제는 RLS를 넘는 service_role로 수행한다.
- **원자성**: DB CASCADE는 단일 트랜잭션 → "반쯤 삭제"가 원천 불가능.
  `deleteUser` 실패 시 아무것도 지워지지 않고 500.
- **Storage만 예외**: 이미지 파일은 DB 트랜잭션 밖이라 best-effort. 계정은 이미 삭제됐으므로
  이미지 정리 실패는 200을 유지한다(고아 이미지는 추후 별도 정리 가능). 그래서 이미지 경로를
  **삭제 전에** 확보한다.
- 기존 수동 삭제 100여 줄과 순서 버그는 통째로 제거한다.

## 에러 처리

| 상황 | 응답 |
|---|---|
| 미로그인 | 401 |
| `deleteUser` 실패 (FK 위반 등 포함) | 500, 실패 안내 (재시도 가능) |
| Storage 이미지 삭제 실패 | 로그만 남기고 200 유지 |

## 선행 확인 (구현 첫 단계) — 완료 (2026-07-23)

1. **스키마 드리프트 확인 결과**: 라이브 DB의 `auth.users` 참조 FK를 전수 확인한 결과,
   `a`(NO ACTION)/`r`(RESTRICT)는 하나도 없어 `deleteUser`가 FK 위반으로 막힐 위험은 없었다.
   - `activity_likes`: 마이그레이션엔 없지만 대시보드에서 생성됐고 이미 `CASCADE` FK가 있어 정상.
   - `reading_records`: **BASE TABLE**이지만 `auth.users`로 향하는 CASCADE FK가 없어 고아 위험이
     있었다. 현재 행 0개(고아 0). → 마이그레이션
     `20260723000002_add_reading_records_user_fk.sql`로 CASCADE FK를 추가해 보정.
   - `user_follow_stats`: **VIEW**(follows에서 계산)라 삭제 대상 아님.
   - (확인에 쓴 SQL은 `pg_constraint`의 `confdeltype`, `information_schema`의 `table_type` 조회.)
2. **환경변수 확인 결과**: 운영(Vercel Production·Preview)에 `SUPABASE_SERVICE_ROLE_KEY`가
   Sensitive 값으로 등록돼 있음을 확인.

## 검증 (구현 후)

테스트 계정으로 실제 삭제를 수행하고 다음을 확인한다.

1. `auth.users`에서 해당 사용자가 사라진다.
2. 딸린 데이터(books, activities, notifications, follows, taste_analyses,
   book_recommendations 등)가 삭제된다.
3. 내가 남긴 댓글은 삭제되지 않고 작성자만 비워진 채 보존된다.
4. 개인정보처리방침의 "탈퇴하면 즉시 삭제" 문구와 실제 동작이 일치한다.

## 범위 밖 (별도 항목)

- 크론 인증 fail-open(②), 레이트리밋 RPC(③), Sentry Git 정리(④), Sentry 설정(⑤)은
  각각 별도 작업으로 진행한다.

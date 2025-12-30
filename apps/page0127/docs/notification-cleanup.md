# 알림 자동 삭제 정책

## 개요
읽은 알림은 30일 후 자동으로 삭제됩니다.

## 구현 방식

### 1. Cleanup API 엔드포인트
- **경로**: `POST /api/notifications/cleanup`
- **기능**: 30일 이상 지난 읽은 알림 삭제
- **보안**: `CRON_SECRET` 환경변수로 인증

### 2. Vercel Cron Job
- **설정 파일**: `vercel.json`
- **실행 주기**: 매일 오전 2시 (KST 기준 오전 11시)
- **Cron 표현식**: `0 2 * * *` (UTC 기준)

## 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경변수 추가:

```
CRON_SECRET=your-secret-key-here
```

이 값은 보안을 위해 랜덤하고 예측 불가능한 문자열로 설정하세요.

## 로컬 테스트

로컬에서 cleanup 엔드포인트를 테스트하려면:

```bash
# .env.local 파일에 CRON_SECRET 추가
CRON_SECRET=test-secret

# API 호출
curl -X POST http://localhost:3000/api/notifications/cleanup \
  -H "Authorization: Bearer test-secret"
```

## 주의사항

1. **읽지 않은 알림은 삭제되지 않음**
   - `is_read = false`인 알림은 기간과 관계없이 유지됨

2. **Vercel Hobby 플랜 제한**
   - Hobby 플랜에서는 cron job이 지원되지 않을 수 있음
   - Pro 플랜 이상에서 사용 가능

3. **대안 방법**
   - GitHub Actions로 주기적으로 API 호출
   - 외부 cron 서비스(cron-job.org 등) 사용
   - Supabase Database Functions 사용

## GitHub Actions 대안

Vercel cron을 사용할 수 없는 경우 `.github/workflows/cleanup-notifications.yml` 파일 생성:

```yaml
name: Cleanup Old Notifications

on:
  schedule:
    - cron: '0 2 * * *'  # 매일 오전 2시 (UTC)
  workflow_dispatch:  # 수동 실행 가능

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup API
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/notifications/cleanup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

GitHub Secrets에 다음 값 추가:
- `APP_URL`: 배포된 앱 URL (예: https://your-app.vercel.app)
- `CRON_SECRET`: cron 인증 시크릿

'use client';

import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

/**
 * ⚠️ 브라우저 소스맵 검증용 임시 페이지 — **main 에 머지하지 않는다.**
 *
 * 왜 필요한가:
 * 서버 오류는 Sentry 에서 원본 위치(`app/api/.../route.ts:108`)로 잘 해석되는 것을
 * 확인했지만, 브라우저 오류는 소스맵 업로드 경로가 달라 따로 확인해야 한다.
 * 지금까지 쌓인 이슈가 전부 서버 쪽이라 확인할 표본이 없었다.
 *
 * 확인 방법:
 *   1. 이 브랜치로 PR 을 열면 Preview 가 배포된다
 *   2. Preview 에서 이 페이지의 버튼을 누른다
 *   3. Sentry(environment=vercel-preview)에 아래 throw 위치가
 *      `app/(public)/sentry-sourcemap-check/page.tsx:<줄>` 로 찍히면 정상이다
 *      압축된 청크명(`chunks/1234-abcd.js:1`)이 나오면 소스맵이 안 붙은 것이다
 *   4. 확인이 끝나면 **PR 을 닫고 브랜치를 지운다** (머지하지 않으므로 운영 무영향)
 *
 * 이벤트 핸들러에서 throw 하면 React error boundary 가 아니라 window 로 전파되어
 * Sentry 전역 핸들러가 잡는다 — 실사용자 오류와 같은 경로다.
 */
export default function SentrySourcemapCheckPage() {
  return (
    <PageContainer width='content'>
      <h1 className='heading-1 text-text-strong'>Sentry 소스맵 검증</h1>
      <p className='mt-2 text-sm text-text-subtle'>
        아래 버튼을 누르면 브라우저에서 의도적으로 오류가 발생합니다. 화면이
        깨져 보여도 정상이며, 새로고침하면 돌아옵니다.
      </p>

      <Button
        className='mt-6'
        onClick={() => {
          throw new Error('소스맵 검증용 브라우저 예외 (임시 페이지)');
        }}
      >
        오류 발생시키기
      </Button>
    </PageContainer>
  );
}

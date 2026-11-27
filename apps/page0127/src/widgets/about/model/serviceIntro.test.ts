import { describe, expect, it } from 'vitest';

import { SERVICE_DEFINITION, SERVICE_TAGLINE } from './serviceIntro';

describe('serviceIntro', () => {
  it('정의 문장은 "page0127.은 + 한 줄 소개 + 입니다." 로 시작한다', () => {
    // 홈 JSON-LD(SERVICE_TAGLINE)와 /about 정의가 어긋나지 않는지 지킨다
    expect(
      SERVICE_DEFINITION.startsWith(`page0127.은 ${SERVICE_TAGLINE}입니다.`)
    ).toBe(true);
  });

  it('11/26 확정한 정의 문장(B안) 그대로다', () => {
    expect(SERVICE_DEFINITION).toBe(
      'page0127.은 읽은 책으로 내 책장을 만들어 앱 설치 없이 링크 하나로 보여 주는 무료 웹 독서 기록 서비스입니다. 책장이 쌓이면 AI가 독서 취향을 분석하고 다음 책을 추천합니다.'
    );
  });
});

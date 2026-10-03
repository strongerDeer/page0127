import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { toAlertText, verifySentrySignature } from './sentryAlert';

const SECRET = 'client-secret';
const sign = (body: string, secret = SECRET) =>
  createHmac('sha256', secret).update(body, 'utf8').digest('hex');

const payload = {
  action: 'triggered',
  data: {
    triggered_rule: '새 이슈 즉시 알림',
    event: {
      title: 'TypeError: Cannot read properties of null',
      level: 'error',
      culprit: 'app/api/books/route.ts in GET',
      environment: 'vercel-production',
    },
  },
};

describe('verifySentrySignature', () => {
  const raw = JSON.stringify(payload);

  it('같은 비밀로 계산한 서명이면 통과한다', () => {
    expect(verifySentrySignature(raw, sign(raw), SECRET)).toBe(true);
  });

  it('본문이 한 글자라도 바뀌면 거절한다', () => {
    expect(verifySentrySignature(raw.replace('error', 'fatal'), sign(raw), SECRET)).toBe(false);
  });

  it('다른 비밀로 만든 서명은 거절한다', () => {
    expect(verifySentrySignature(raw, sign(raw, 'attacker'), SECRET)).toBe(false);
  });

  it('서명 헤더가 없으면 거절한다', () => {
    expect(verifySentrySignature(raw, null, SECRET)).toBe(false);
  });

  it('공백이 다른 원문이어도 JSON.stringify 기준 서명이면 통과한다', () => {
    const pretty = JSON.stringify(payload, null, 2);
    expect(verifySentrySignature(pretty, sign(raw), SECRET)).toBe(true);
  });

  it('JSON 이 아닌 본문은 거절한다', () => {
    expect(verifySentrySignature('not json', sign('other'), SECRET)).toBe(false);
  });
});

describe('toAlertText', () => {
  it('수준·환경·제목·위치·규칙을 담는다', () => {
    expect(toAlertText(payload)).toBe(
      [
        '🚨 [page0127] error · vercel-production',
        'TypeError: Cannot read properties of null',
        '위치: app/api/books/route.ts in GET',
        '규칙: 새 이슈 즉시 알림',
      ].join('\n')
    );
  });

  it('비어 있는 항목은 줄째 뺀다', () => {
    expect(toAlertText({ data: { event: { title: 'x' } } })).toBe('🚨 [page0127] error\nx');
  });
});

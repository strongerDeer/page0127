import { describe, expect, it } from 'vitest';

import { strokesOf } from '@/entities/typing';

import { checkTypingRecord, isAssistedInput, MAX_CPM } from './recordCheck';

const TEXT = '나는 너를 길들였어. 너는 내게 하나뿐인 여우야.';
const STROKES = [...TEXT].reduce((n, c) => n + strokesOf(c), 0);
/** 이 글을 1분에 친 시간(서버 여유 3초 포함) */
const ONE_MINUTE = 60_000 + 3000;

describe('checkTypingRecord — 서버가 기록을 다시 따진다', () => {
  it('정상 기록은 브라우저 타수를 그대로 쓴다', () => {
    const r = checkTypingRecord({
      text: TEXT,
      typed: TEXT,
      clientCpm: STROKES - 5,
      serverWindowMs: ONE_MINUTE,
      assisted: false,
    });
    expect(r).toEqual({
      ok: true,
      accuracy: 100,
      cpm: STROKES - 5,
      rankable: true,
      clipped: false,
    });
  });

  it('서버 시간 안에 불가능한 타수는 상한으로 깎는다', () => {
    const r = checkTypingRecord({
      text: TEXT,
      typed: TEXT,
      clientCpm: MAX_CPM,
      serverWindowMs: ONE_MINUTE,
      assisted: false,
    });
    expect(r.ok && r.cpm).toBe(STROKES);
    expect(r.ok && r.clipped).toBe(true);
  });

  it('정확도는 브라우저 값이 아니라 친 글로 센다', () => {
    const typed = `${TEXT.slice(0, -2)}아.`; // '야' → '아'
    const r = checkTypingRecord({
      text: TEXT,
      typed,
      clientCpm: 100,
      serverWindowMs: ONE_MINUTE,
      assisted: false,
    });
    expect(r.ok && r.accuracy).toBe(
      Math.round(((TEXT.length - 1) / TEXT.length) * 100)
    );
  });

  it('틀린 글자는 타수 상한에서도 빠진다', () => {
    const typed = 'ㅋ'.repeat(TEXT.length);
    const r = checkTypingRecord({
      text: TEXT,
      typed,
      clientCpm: 300,
      serverWindowMs: ONE_MINUTE,
      assisted: false,
    });
    expect(r.ok && r.cpm).toBe(0);
    expect(r.ok && r.rankable).toBe(false);
  });

  it('끝까지 치지 않은 기록은 받지 않는다', () => {
    const r = checkTypingRecord({
      text: TEXT,
      typed: TEXT.slice(0, 5),
      clientCpm: 100,
      serverWindowMs: ONE_MINUTE,
      assisted: false,
    });
    expect(r.ok).toBe(false);
  });

  it('서버 시간이 없거나 자동 입력이면 타수 0 — 진행도만 남는다', () => {
    for (const [serverWindowMs, assisted] of [
      [null, false],
      [ONE_MINUTE, true],
    ] as const) {
      const r = checkTypingRecord({
        text: TEXT,
        typed: TEXT,
        clientCpm: 300,
        serverWindowMs,
        assisted,
      });
      expect(r).toMatchObject({ ok: true, cpm: 0, rankable: false });
    }
  });
});

describe('isAssistedInput — 자동 입력 흔적', () => {
  it('사람이 친 한두 글자는 괜찮다', () => {
    expect(isAssistedInput({ trusted: true, composing: false, added: 1 })).toBe(
      false
    );
    expect(isAssistedInput({ trusted: true, composing: false, added: 2 })).toBe(
      false
    );
  });
  it('조합 없이 한 번에 3글자 이상이면 표시한다', () => {
    expect(isAssistedInput({ trusted: true, composing: false, added: 3 })).toBe(
      true
    );
  });
  it('스크립트가 만든 이벤트는 표시한다', () => {
    expect(
      isAssistedInput({ trusted: false, composing: false, added: 1 })
    ).toBe(true);
  });
});

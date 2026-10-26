import { describe, expect, it } from 'vitest';

import { decodeTextFile } from './decodeTextFile';

describe('decodeTextFile', () => {
  it('UTF-8 파일은 그대로 읽는다', () => {
    const bytes = new TextEncoder().encode('제목,저자\n데미안,헤르만 헤세');
    expect(decodeTextFile(bytes.buffer as ArrayBuffer)).toBe(
      '제목,저자\n데미안,헤르만 헤세'
    );
  });

  it('한국어 엑셀이 저장한 EUC-KR 파일도 읽는다', () => {
    // "제목" 의 EUC-KR 바이트
    const bytes = new Uint8Array([0xc1, 0xa6, 0xb8, 0xf1]);
    expect(decodeTextFile(bytes.buffer)).toBe('제목');
  });
});

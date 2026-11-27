import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  INDEXNOW_KEY,
  shouldSubmitToIndexNow,
  submitToIndexNow,
  toIndexNowUrls,
} from './indexNow';

const SITE = 'https://page0127.com';

describe('IndexNow 키 파일', () => {
  it('public/{키}.txt 가 있고 내용이 키와 같다', () => {
    const file = path.resolve(
      __dirname,
      '../../../../public',
      `${INDEXNOW_KEY}.txt`
    );
    expect(readFileSync(file, 'utf8').trim()).toBe(INDEXNOW_KEY);
  });

  it('키는 IndexNow 규칙(8~128자, 영문·숫자·-)을 따른다', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
  });
});

describe('shouldSubmitToIndexNow', () => {
  it('운영 https 주소일 때만 보낸다', () => {
    expect(shouldSubmitToIndexNow(SITE, 'production')).toBe(true);
    expect(shouldSubmitToIndexNow(SITE, 'preview')).toBe(false);
    expect(shouldSubmitToIndexNow(SITE, undefined)).toBe(false);
    expect(shouldSubmitToIndexNow('http://localhost:3000', 'production')).toBe(
      false
    );
    expect(shouldSubmitToIndexNow(undefined, 'production')).toBe(false);
  });
});

describe('toIndexNowUrls', () => {
  it('경로를 전체 주소로 바꾸고 중복·다른 도메인은 뺀다', () => {
    expect(
      toIndexNowUrls(
        ['/blog', '/blog/a', '/blog/a', `${SITE}/about`, 'https://other.com/x'],
        SITE
      )
    ).toEqual([`${SITE}/blog`, `${SITE}/blog/a`, `${SITE}/about`]);
  });

  it('한글 slug 도 주소 규칙대로 인코딩한다', () => {
    expect(toIndexNowUrls(['/blog/어린왕자'], SITE)).toEqual([
      `${SITE}/blog/${encodeURIComponent('어린왕자')}`,
    ]);
  });
});

describe('submitToIndexNow', () => {
  it('운영이면 host·key·keyLocation·urlList 를 POST 한다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const status = await submitToIndexNow(['/blog/a'], {
      siteUrl: SITE,
      vercelEnv: 'production',
      fetchImpl,
    });

    expect(status).toBe(202);
    const [endpoint, init] = fetchImpl.mock.calls[0];
    expect(endpoint).toBe('https://api.indexnow.org/indexnow');
    expect(JSON.parse(init.body)).toEqual({
      host: 'page0127.com',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: [`${SITE}/blog/a`],
    });
  });

  it('운영이 아니면 보내지 않는다', async () => {
    const fetchImpl = vi.fn();
    const status = await submitToIndexNow(['/blog/a'], {
      siteUrl: SITE,
      vercelEnv: 'preview',
      fetchImpl,
    });
    expect(status).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('네트워크 실패는 throw 하지 않고 null 을 돌려준다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi.fn().mockRejectedValue(new Error('timeout'));
    await expect(
      submitToIndexNow(['/blog/a'], {
        siteUrl: SITE,
        vercelEnv: 'production',
        fetchImpl,
      })
    ).resolves.toBeNull();
    warn.mockRestore();
  });
});

import type { NextResponse } from 'next/server';

/** Keep rotated tokens (and their no-cache headers) when returning a new response. */
export function copyAuthResponse(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  for (const name of ['Cache-Control', 'Expires', 'Pragma']) {
    const value = source.headers.get(name);
    if (value !== null) target.headers.set(name, value);
  }
  return target;
}

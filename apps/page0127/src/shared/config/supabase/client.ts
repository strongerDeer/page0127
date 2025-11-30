import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Component용 Supabase 클라이언트
 *
 * 학습 포인트:
 * - 'use client' 컴포넌트에서 사용
 * - 브라우저에서 실행 (useState, useEffect 등과 함께)
 * - 싱글톤 패턴으로 하나의 인스턴스만 생성
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

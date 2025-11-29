import { cookies } from 'next/headers'

import { createServerClient } from '@supabase/ssr'

/**
 * Server Component용 Supabase 클라이언트
 *
 * 학습 포인트:
 * - Server Component에서만 사용 (async/await 가능)
 * - cookies()를 통해 인증 상태 유지
 * - 매 요청마다 새로운 인스턴스 생성
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 설정이 무시될 수 있음
            // Middleware나 Server Action에서만 쿠키 변경 가능
          }
        },
      },
    }
  )
}

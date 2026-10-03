import Link from 'next/link';

import { loadKakaoTokens } from '@/shared/lib/kakao-alert/tokenStore';

import type { StoredKakaoTokens } from '@/shared/lib/kakao-alert/tokens';

type KakaoAlertStatusProps = {
  /** callback 이 돌려보낸 결과(?kakao=connected|error&reason=…) */
  result?: string;
  reason?: string;
};

const REASON_TEXT: Record<string, string> = {
  state_mismatch: '연결 요청이 만료됐거나 다른 창에서 시작됐습니다. 다시 눌러 주세요.',
  exchange_failed: '토큰을 받지 못했습니다. 환경변수와 카카오 콘솔의 Redirect URI 를 확인하세요.',
  access_denied: '카카오 동의를 취소했습니다.',
};

const formatDate = (date: Date) =>
  date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' });

/**
 * 어드민 에러 화면 상단 — 카카오 알림 연결 상태.
 *
 * 리프레시 토큰 만료일을 보여 주는 이유: 주간 갱신 크론이 돌고 있다면 이 날짜가 계속
 * 뒤로 밀린다. 날짜가 다가오는데 그대로라면 크론이 멈춘 것이다.
 */
export const KakaoAlertStatus = async ({ result, reason }: KakaoAlertStatusProps) => {
  let tokens: StoredKakaoTokens | null = null;
  let loadFailed = false;
  try {
    tokens = await loadKakaoTokens();
  } catch (e) {
    console.error('[kakao-alert] 상태 조회 실패:', e);
    loadFailed = true;
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-4 py-3 text-sm'>
      <div className='space-y-1'>
        <p className='font-medium'>카카오톡 에러 알림</p>
        <p className='text-xs text-text-subtle'>
          {loadFailed
            ? '상태를 읽지 못했습니다(토큰 테이블 마이그레이션 확인).'
            : tokens
              ? `연결됨 · 다시 연결 필요 시점 ${formatDate(tokens.refreshTokenExpiresAt)}(주간 갱신으로 계속 연장)`
              : '연결 안 됨 — 운영 에러가 나도 카톡이 오지 않습니다.'}
        </p>
        {result === 'connected' && (
          <p className='text-xs'>연결했습니다. 카톡으로 시험 메시지가 왔는지 확인하세요.</p>
        )}
        {result === 'error' && (
          <p className='text-xs text-destructive'>
            {REASON_TEXT[reason ?? ''] ?? `연결 실패(${reason ?? '알 수 없음'})`}
          </p>
        )}
      </div>
      {/* prefetch 를 끈다 — 이 주소는 페이지가 아니라 "연결 시작" 라우트라, 화면에 보이기만 해도
          미리 불러오면 state 쿠키를 심고 카카오로 가는 요청이 의도 없이 나간다. */}
      <Link
        href='/api/admin/kakao-alert/connect'
        prefetch={false}
        className='rounded-md border border-line px-3 py-1.5 text-xs hover:bg-muted'
      >
        {tokens ? '다시 연결' : '연결하기'}
      </Link>
    </div>
  );
};

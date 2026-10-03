import {
  type KakaoAlertConfig,
  KakaoUnauthorizedError,
  refreshTokens,
  sendMemo,
} from './kakaoApi';
import {
  isRefreshTokenExpired,
  needsAccessRefresh,
  type StoredKakaoTokens,
  toStoredTokens,
} from './tokens';

/**
 * "토큰 꺼내기 → 필요하면 갱신·저장 → 보내기"를 한 곳에 묶는다.
 *
 * DB·설정·fetch·현재 시각을 인자로 받는다(의존성 주입). 그래서 테스트는 DB 없이
 * "언제 갱신하는가", "거절되면 한 번만 다시 시도하는가"만 확인할 수 있다.
 * 실제 연결은 라우트에서 tokenStore·getKakaoAlertConfig 를 넣어 만든다.
 */
export type KakaoAlertDeps = {
  config: KakaoAlertConfig;
  load: () => Promise<StoredKakaoTokens | null>;
  save: (tokens: StoredKakaoTokens) => Promise<void>;
  fetchFn?: typeof fetch;
  now?: () => Date;
};

export type AlertMessage = { text: string; linkUrl: string; buttonTitle?: string };

export class KakaoNotConnectedError extends Error {}

/** 갱신하고 저장까지 한다. 크론(주간 갱신)과 발송이 같이 쓴다 */
export const refreshAndSave = async (
  deps: KakaoAlertDeps,
  current: StoredKakaoTokens
): Promise<StoredKakaoTokens> => {
  const now = deps.now?.() ?? new Date();
  if (isRefreshTokenExpired(current, now)) {
    throw new KakaoNotConnectedError(
      '카카오 리프레시 토큰이 만료됐습니다 — 어드민에서 다시 연결해야 합니다.'
    );
  }
  const response = await refreshTokens(deps.config, current.refreshToken, deps.fetchFn);
  const next = toStoredTokens(response, now, current);
  await deps.save(next);
  return next;
};

export const sendKakaoAlert = async (deps: KakaoAlertDeps, message: AlertMessage): Promise<void> => {
  const stored = await deps.load();
  if (!stored) {
    throw new KakaoNotConnectedError('카카오 알림이 아직 연결되지 않았습니다 — 어드민에서 연결하세요.');
  }

  const now = deps.now?.() ?? new Date();
  let tokens = needsAccessRefresh(stored, now) ? await refreshAndSave(deps, stored) : stored;

  try {
    await sendMemo(tokens.accessToken, message, deps.fetchFn);
  } catch (e) {
    // 만료 시각상으론 유효한데 거절됐다(카카오 쪽에서 무효화 등) → 갱신해서 딱 한 번만 다시 보낸다.
    // 계속 재시도하면 같은 에러 알림이 폭주할 수 있다.
    if (!(e instanceof KakaoUnauthorizedError)) throw e;
    tokens = await refreshAndSave(deps, tokens);
    await sendMemo(tokens.accessToken, message, deps.fetchFn);
  }
};

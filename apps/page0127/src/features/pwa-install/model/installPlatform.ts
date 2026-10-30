import { detectInAppBrowser } from '@/shared/lib/auth/inAppBrowser';

/**
 * 이 기기에서 page0127. 을 "홈 화면에 추가"하는 방법이 무엇인가 — 설치 안내 창이 보여 줄 한 가지.
 *
 * 순수 함수로 뺀 이유: 기기마다 길이 다 다르고(아이폰은 공유 메뉴, 안드로이드·PC 크롬은
 * 설치 버튼, 맥 사파리는 Dock) 분기가 틀리기 쉽다. UA 흉내는 테스트에서 하는 게 싸다.
 */
export type InstallPlatform =
  /** 이미 홈 화면 앱(standalone)으로 열려 있다 */
  | 'installed'
  /** 인스타·카톡 같은 앱 안 브라우저 — 여기선 설치가 안 되니 사파리·크롬으로 보내야 한다 */
  | 'in-app'
  /** 아이폰·아이패드 — 공유 버튼 → 홈 화면에 추가 */
  | 'ios'
  /** 안드로이드 — 설치 버튼(beforeinstallprompt) 또는 브라우저 메뉴 */
  | 'android'
  /** PC 크롬·엣지 — 설치 버튼 또는 주소창 설치 아이콘 */
  | 'desktop-chromium'
  /** 맥 사파리(17+) — 파일 메뉴 → Dock에 추가 */
  | 'desktop-safari'
  /** 그 밖(PC 파이어폭스 등) — 크롬·엣지로 안내한다 */
  | 'unsupported';

export type InstallEnvironment = {
  userAgent: string;
  maxTouchPoints: number;
  isStandalone: boolean;
};

export const detectInstallPlatform = ({
  userAgent,
  maxTouchPoints,
  isStandalone,
}: InstallEnvironment): InstallPlatform => {
  if (isStandalone) return 'installed';
  // 앱 안 브라우저는 OS 보다 먼저 본다 — 카톡 웹뷰도 UA 에 iPhone 이 들어 있다
  if (detectInAppBrowser(userAgent)) return 'in-app';

  // iPadOS 13+ 사파리는 UA 가 맥으로 나오므로 터치로 가른다(pushSupport 의 isIosUserAgent 와 같은 규칙)
  const isIos =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (isIos) return 'ios';

  if (/Android/i.test(userAgent)) return 'android';

  // 파이어폭스는 PC 에서 설치를 지원하지 않는다. 크롬 계열 UA 에도 Safari 가 들어 있어 순서가 중요하다
  if (/Firefox\//.test(userAgent)) return 'unsupported';
  if (/Chrome\/|Chromium\/|Edg\//.test(userAgent)) return 'desktop-chromium';
  if (/Macintosh/.test(userAgent) && /Safari\//.test(userAgent)) {
    return 'desktop-safari';
  }
  return 'unsupported';
};

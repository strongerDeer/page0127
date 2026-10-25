import { permanentRedirect } from 'next/navigation';

/**
 * 예전 소개 페이지 주소 — 소개는 홈에 합쳐지고(2026-10-25), 남은 업데이트 이력은
 * /updates 로 옮겼다. 공유·검색으로 들어온 /about 링크가 끊기지 않게 영구 이동시킨다.
 */
const AboutPage = () => permanentRedirect('/updates');

export default AboutPage;

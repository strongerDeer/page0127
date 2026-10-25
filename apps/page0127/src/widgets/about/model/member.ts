/**
 * 홈을 보는 로그인 사용자 — 비로그인이면 null.
 * 홈은 하나지만 버튼은 사람마다 다르다(가입 ↔ 내 서재로·서재 공유하기).
 */
export type HomeMember = {
  username: string;
  /** 공유 시트·받는 쪽에 보이는 이름 ("OO님의 책장") */
  displayName: string;
};

/**
 * 추천 리더 맨 앞에 항상 보이는 사람 — page0127. 제작자.
 *
 * id 가 아니라 username 으로 둔다: 운영·개발·로컬 DB 마다 id 가 다르다.
 * ⚠️ 사용자명을 바꾸면 여기도 바꿔야 한다. 못 찾으면 조용히 빠질 뿐 화면은 깨지지 않는다
 * (packages/quality/src/config.ts 의 측정 앵커도 같은 사용자명을 쓴다).
 */
export const FEATURED_READER_USERNAME = 'stronger_khj';

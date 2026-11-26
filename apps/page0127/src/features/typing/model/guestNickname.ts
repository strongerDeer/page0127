/**
 * 비회원 랭킹 닉네임 검사 — 서버 액션과 입력 창이 같은 규칙을 쓴다.
 *
 * - 2~10자, 한글 완성형·영문·숫자만(공백·기호·이모지 X). DB CHECK 와 같은 규칙이다.
 * - 운영자 사칭·욕설은 막는다. 남에게는 첫 글자만 보이지만("책**") 본인 화면과 DB 에는 남는다.
 */
export type NicknameCheck =
  { ok: true; nickname: string } | { ok: false; message: string };

export const GUEST_NICKNAME_MIN = 2;
export const GUEST_NICKNAME_MAX = 10;

const PATTERN = /^[가-힣a-zA-Z0-9]+$/;

// 들어 있으면 막는 말(소문자로 비교). 짧은 금칙어는 오탐이 많아 대표적인 것만 둔다.
const BANNED = [
  '운영자',
  '관리자',
  '어드민',
  'admin',
  'page0127',
  '공식',
  'official',
  '씨발',
  '씨바',
  '병신',
  '븅신',
  '좆',
  '지랄',
  '개새',
  '새끼',
  '미친놈',
  '미친년',
  '니애미',
  '느금',
  '섹스',
  'sex',
  'fuck',
  'shit',
  'bitch',
];

export const validateGuestNickname = (raw: unknown): NicknameCheck => {
  const nickname = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (
    nickname.length < GUEST_NICKNAME_MIN ||
    nickname.length > GUEST_NICKNAME_MAX
  )
    return {
      ok: false,
      message: `닉네임은 ${GUEST_NICKNAME_MIN}~${GUEST_NICKNAME_MAX}자로 적어 주세요.`,
    };
  if (!PATTERN.test(nickname))
    return { ok: false, message: '한글·영문·숫자만 쓸 수 있어요.' };
  const lower = nickname.toLowerCase();
  if (BANNED.some((word) => lower.includes(word)))
    return { ok: false, message: '다른 닉네임을 써 주세요.' };
  return { ok: true, nickname };
};

/**
 * AI 응답에 남은 익명 라벨(user1/user2)을 화면에 보여줄 이름으로 바꾼다.
 *
 * 왜 필요한가:
 * 궁합 프롬프트는 두 사람을 user1/user2로 지칭한다(실명을 외부 모델에 보내지
 * 않기 위해서다). 그런데 AI가 만든 자유 문장 안에 그 라벨이 그대로 남아
 * "user1은 역사에 관심이 많아요" 같은 문장이 사용자에게 노출됐다.
 *
 * reading_patterns 처럼 키가 user1/user2인 값은 호출부에서 매핑할 수 있지만,
 * 문장 속에 박힌 라벨은 이렇게 치환할 수밖에 없다.
 *
 * 한국어 조사 처리:
 * 단순 치환은 "user1은" → "나은"이 되어버린다. 앞말의 받침 유무에 따라
 * 은/는·이/가·을/를·과/와를 골라준다. 1인칭 '나'는 주격에서 '내가'로 바뀌는
 * 예외가 있어 따로 처리한다.
 */

/** 치환에 쓸 이름 — 정렬된 쌍 기준으로 user1, user2에 각각 대응한다 */
export type UserLabelNames = {
  first: string;
  second: string;
};

/** 받침 유무에 따라 형태가 갈리는 조사쌍: [받침 있음, 받침 없음] */
const JOSA_PAIRS: Record<string, [string, string]> = {
  은: ['은', '는'],
  는: ['은', '는'],
  이: ['이', '가'],
  가: ['이', '가'],
  을: ['을', '를'],
  를: ['을', '를'],
  과: ['과', '와'],
  와: ['과', '와'],
};

const SUBJECT_JOSA = new Set(['이', '가']);

/** 한글 음절의 받침 유무 — 유니코드 조합 규칙상 (코드 - 0xAC00) % 28 이 0이면 받침이 없다 */
const hasBatchim = (word: string): boolean => {
  const last = word.trim().at(-1);
  if (!last) return false;

  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    // 한글이 아니면(영문·숫자로 끝나는 닉네임 등) 판단할 수 없다.
    // 받침 있음으로 보면 '은/이/을'이 붙어 어색함이 덜하다.
    return true;
  }

  return (code - 0xac00) % 28 !== 0;
};

export const replaceUserLabels = (
  text: string,
  names: UserLabelNames
): string =>
  text.replace(/user([12])(은|는|이|가|을|를|과|와)?/g, (_match, index, josa) => {
    const name = index === '1' ? names.first : names.second;

    if (!josa) return name;

    // '나' + 주격조사는 '내가'가 된다 ('나가'가 아니다)
    if (name === '나' && SUBJECT_JOSA.has(josa)) return '내가';

    const [withBatchim, withoutBatchim] = JOSA_PAIRS[josa];
    return name + (hasBatchim(name) ? withBatchim : withoutBatchim);
  });

/**
 * 올린 CSV 파일을 글자로 바꾼다. UTF-8 이 아니면 EUC-KR(CP949)로 읽는다.
 *
 * 왜 두 번 시도하는가: 한국어 엑셀의 "CSV (쉼표로 분리)" 저장은 **EUC-KR** 로 쓴다.
 * UTF-8 로만 읽으면 한글 제목이 전부 "�"로 깨지는데 오류는 나지 않아서, 사용자는
 * "아무것도 못 찾았어요"만 보게 된다. 구글 시트·Goodreads·"CSV UTF-8" 저장은 UTF-8 이다.
 *
 * `fatal: true` 면 UTF-8 로 해석할 수 없는 바이트에서 예외가 난다 → 그때 EUC-KR 로 다시 읽는다.
 */
export const decodeTextFile = (buffer: ArrayBuffer): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('euc-kr').decode(buffer);
  }
};

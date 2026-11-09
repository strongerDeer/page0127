/**
 * 서점의 저자 줄을 저자·옮긴이로 나눈다.
 *
 * YES24 는 "알베르 카뮈 저/김화영 역" 처럼 한 줄로 준다. 오늘의 문장 출처는
 * "《이방인》 · 알베르 카뮈 · 김화영 옮김" 으로 그리므로 둘을 따로 채운다.
 * 모르는 모양이면 통째로 저자에 넣는다 — 어드민이 바로 고칠 수 있다.
 */
export const splitCredit = (
  credit: string
): { author: string; translator: string } => {
  const authors: string[] = [];
  const translators: string[] = [];

  for (const part of credit.split('/').map((p) => p.trim())) {
    const translated = part.match(/^(.+?)\s*(역|옮김|번역)$/);
    if (translated) {
      translators.push(translated[1]);
      continue;
    }
    const written = part.match(/^(.+?)\s*(저|글|지음|원저)$/);
    if (written) authors.push(written[1]);
    // 그림·감수 등은 출처 줄에 넣지 않는다
  }

  if (authors.length === 0 && translators.length === 0)
    return { author: credit.trim(), translator: '' };
  return { author: authors.join(', '), translator: translators.join(', ') };
};

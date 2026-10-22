import type { RecapCard } from '../model/types';

/** '『제목』' 또는 '『제목』 외 2권' */
const titles = (card: RecapCard): string =>
  card.others.length > 0
    ? `『${card.lead.title}』 외 ${card.others.length}권`
    : `『${card.lead.title}』`;

/**
 * 회상 카드 → 알림 한 줄. 알릴 거리가 아니면 null.
 *
 * 'still-reading' 은 알리지 않는다. 같은 책을 '2주 넘게 읽는 중' 알림
 * (reading_reminder)이 이미 짚으므로 두 번 말하게 된다.
 *
 * 조사(을/를·이/가)는 제목 끝 글자에 따라 갈리므로, 제목 바로 뒤에 조사가
 * 붙지 않는 문장으로 쓴다.
 */
export const toRecapNotice = (card: RecapCard): string | null => {
  switch (card.kind) {
    case 'this-week':
      return card.variant === 'completed'
        ? `이번 주에 ${titles(card)} 읽기를 마쳤어요. 한 주를 돌아볼까요?`
        : `이번 주 서재에 ${card.others.length > 0 ? titles(card) : `${titles(card)} 한 권`}이 새로 담겼어요.`;
    case 'years-ago':
      return `${card.yearsAgo}년 전 이맘때 ${titles(card)} 읽기를 마쳤어요. 그때를 돌아볼까요?`;
    case 'still-reading':
      return null;
  }
};

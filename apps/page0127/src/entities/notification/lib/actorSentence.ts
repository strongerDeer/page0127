import type { Notification, NotificationTarget } from '../model/types';

/** 알림 문장에 넣을 책 제목 — 부제(" - …", ": …")를 떼고, 그래도 길면 자른다 */
const MAX_TITLE_LENGTH = 20;

export const toShortTitle = (title: string): string => {
  const main = title.split(/\s+[-–—:]\s+|:\s*/)[0]?.trim() || title.trim();
  return main.length > MAX_TITLE_LENGTH
    ? `${main.slice(0, MAX_TITLE_LENGTH)}…`
    : main;
};

/**
 * 다른 사람이 보낸 알림의 문장(보낸 사람 이름 뒤에 붙는 부분). 종 아이콘 목록과 푸시가 함께 쓴다.
 *
 * - 책 제목을 알면 넣는다 — 같은 사람의 댓글 알림 여러 개가 똑같이 보이던 문제(2026-10-23).
 * - 답글은 따로 말한다. 알림 행에는 답글 여부가 없어서 받는 사람이 책 주인인지로 가른다(서버).
 * - 제목을 모르면(비공개 책 등) 예전 문장 그대로.
 * - 나에게 오는 알림(회상·읽는 중)은 문장을 따로 갖고 있어 여기서 다루지 않는다 → null.
 */
export const toActorSentence = (
  type: Notification['type'],
  target?: NotificationTarget | null
): string | null => {
  const book = target?.title ? `『${toShortTitle(target.title)}』` : null;

  switch (type) {
    case 'follow':
      return '님이 팔로우했습니다';
    case 'comment':
      if (target?.isReply) {
        return book
          ? `님이 ${book}에서 내 댓글에 답글을 남겼습니다`
          : '님이 내 댓글에 답글을 남겼습니다';
      }
      return book
        ? `님이 ${book}에 댓글을 남겼습니다`
        : '님이 댓글을 남겼습니다';
    case 'like':
      return book
        ? `님이 ${book}에 좋아요를 눌렀습니다`
        : '님이 좋아요를 눌렀습니다';
    default:
      return null;
  }
};

export const READING_NUDGE_MESSAGES = {
  together: '같이 한 권 읽자 👀',
  chase: '여기까지 따라와 봐 👀',
  wait: '기다려, 다음 책 골랐다 📖',
  next: '다음 한 권으로 승부 보자',
  reading: '요즘 무슨 책 읽어?',
} as const;
export type ReadingNudgeMessage = keyof typeof READING_NUDGE_MESSAGES;
export type NudgeBook = { id: string; title: string };

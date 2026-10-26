export const READING_NUDGE_MESSAGES = {
  recommend: '이 책, 네 취향일 것 같아서.',
  together: '같이 한 권 읽자 👀',
  chase: '여기까지 따라와 봐 👀',
  wait: '기다려, 다음 책 골랐다 📖',
  next: '다음 한 권으로 승부 보자',
  reading: '요즘 무슨 책 읽어?',
} as const;
export type ReadingNudgeMessage = keyof typeof READING_NUDGE_MESSAGES;
export type NudgeBook = { id: string; title: string };
export type ReadingEnvelopeKind = 'recommendation' | 'invitation' | 'note';
export type ReadingEnvelopeInfo = {
  kind: ReadingEnvelopeKind;
  saved_book_id: string | null;
  saved_at: string | null;
  accepted_at: string | null;
};
export type ReadingEnvelopeResponse = {
  book_id: string;
  status: 'want_to_read' | 'reading' | 'completed';
  outcome: 'created' | 'existing' | 'started' | 'completed';
  saved_at: string;
  accepted_at: string | null;
};
export type EnvelopeReply = {
  action: 'save' | 'accept' | 'complete';
  isPublic: boolean;
  completedDate?: string | null;
  completedYear?: number | null;
  rating?: number | null;
  startDate?: string | null;
};
export const ENVELOPE_WORDINGS: Record<ReadingEnvelopeKind, readonly string[]> =
  {
    recommendation: [
      '이 책, 네 취향일 것 같아서.',
      '읽고 나서 네 생각도 궁금해.',
      '이 책 보다가 네 생각이 났어.',
    ],
    invitation: [
      '이 책, 같이 읽을래?',
      '같은 책 읽고 이야기 나누자.',
      '각자 읽고, 나중에 감상 나눌까?',
    ],
    note: ['다음 한 권으로 따라갈게 👀', '요즘 무슨 책 읽어?'],
  };
export const randomEnvelopeWording = (kind: ReadingEnvelopeKind) => {
  const choices = ENVELOPE_WORDINGS[kind];
  return choices[Math.floor(Math.random() * choices.length)];
};

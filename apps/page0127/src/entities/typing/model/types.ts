/** 쪽 아래에 보여 줄 도트 그림 이름 — features/typing/ui/PixelPicture 가 그린다 */
export type TypingPictureKey =
  | 'hat'
  | 'boa'
  | 'boabeast'
  | 'portrait'
  | 'sheep'
  | 'sheep2'
  | 'sheep3'
  | 'box'
  | 'baobab'
  | 'king'
  | 'lamplighter'
  | 'fox'
  | 'well';

export type TypingPage = {
  text: string;
  picture?: TypingPictureKey;
};

export type TypingChapter = {
  /** 1부터 */
  no: number;
  pages: TypingPage[];
};

/** 명문장 한 대목 */
export type TypingPassage = {
  id: string;
  /** 화면 표시용 "21장" */
  chapter: string;
  label: string;
  text: string;
};

/** 다 쓴 쪽 기록(내 것) — typing_records 한 줄 */
export type TypingRecord = {
  page_key: string;
  cpm: number;
  accuracy: number;
  best_cpm: number | null;
  completed_at: string;
};

export type TypingBoard = 'steady' | 'speed';

/** 랭킹 한 줄 — get_typing_ranking() */
export type TypingRankRow = {
  /** 남의 닉네임은 DB가 가려서 준다("책**"). 내 줄만 그대로 */
  nickname: string;
  isMe: boolean;
  /** 비회원 기록(닉네임만으로 오른 줄) — 타수 탭에만 있다 */
  isGuest: boolean;
  value: number;
  /** 타수 탭: 그 최고 타수를 낸 쪽 열쇠('2-10', 'f:fox-secret'). 꾸준함 탭은 null */
  pageKey: string | null;
};

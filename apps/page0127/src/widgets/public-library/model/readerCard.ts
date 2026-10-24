import { toFirstImpression } from '@/entities/taste-analysis/model/firstImpression';
import { getPersonalityColor } from '@/entities/taste-analysis/model/personalityTypes';

/** 숫자를 명함에 적을 최소 권수 — 1~2권은 자랑이 아니라 빈 성적표로 읽힌다 */
export const READER_STAT_MIN_BOOKS = 3;

export type ReaderIdentity = {
  /** analysis = AI 취향 노트 결과 / impression = 책장 분류로 본 첫인상 */
  source: 'analysis' | 'impression';
  name: string;
  color: string;
};

/** 독서 명함 — 서재 상단·공유 카드(OG)가 같은 규칙으로 그린다 */
export type ReaderCard = {
  identity: ReaderIdentity | null;
  /** 숫자 한 줄. 내세울 만하지 않으면 null */
  stat: string | null;
};

type ReaderCardInput = {
  /** 최신 AI 분석의 성향 이름 (get_public_taste_history[0]) — 없으면 null */
  latestType: string | null | undefined;
  /** 공개 완독 책의 분류 (countShelf) — 분석 전 첫인상용 */
  categories: (string | null)[];
  yearBooks: number;
  totalBooks: number;
};

/**
 * 명함의 주인공은 성향 이름, 숫자는 조연 한 줄이다.
 *
 * 성향: AI 분석 결과 → 없으면 공개 완독 책으로 본 첫인상 → 그것도 없으면 null(이름이 주인공)
 * 숫자: 올해 완독 3권 이상 → 아니면 전체 3권 이상 → 아니면 null
 *   연초에는 누구나 "올해 0권"이다. 그때는 쌓아 온 전체 권수가 대신 말한다.
 */
export const toReaderCard = ({
  latestType,
  categories,
  yearBooks,
  totalBooks,
}: ReaderCardInput): ReaderCard => {
  const analyzed = latestType?.trim();
  const impression = analyzed ? null : toFirstImpression(categories);

  const identity: ReaderIdentity | null = analyzed
    ? {
        source: 'analysis',
        name: analyzed,
        // 카탈로그 밖 이름(AI 드리프트)이 와도 기본색으로 그린다
        color: getPersonalityColor(analyzed),
      }
    : impression
      ? { source: 'impression', name: impression.name, color: impression.color }
      : null;

  const stat =
    yearBooks >= READER_STAT_MIN_BOOKS
      ? `올해 ${yearBooks}권 완독`
      : totalBooks >= READER_STAT_MIN_BOOKS
        ? `${totalBooks}권이 꽂힌 서재`
        : null;

  return { identity, stat };
};

/** 성향 이름 위 작은 라벨 — 어디서 나온 이름인지 밝힌다 */
export const toIdentityLabel = (identity: ReaderIdentity): string =>
  identity.source === 'analysis' ? 'AI 독서 성향' : '책장의 첫인상';

import { isoToKstInput } from './kstTime';

import type { HeroSlideRow } from '@/entities/banner/types';

/** DB CHECK(hero_slide_events.action) 과 같은 값 */
export type SlideEventAction =
  | 'create'
  | 'update'
  | 'activate'
  | 'deactivate'
  | 'duplicate'
  | 'delete'
  | 'reorder';

export type SlideChange = { from: unknown; to: unknown };

/** hero_slide_events 한 줄 */
export type SlideEvent = {
  id: number;
  slide_id: string | null;
  slide_title: string;
  action: SlideEventAction;
  changes: Record<string, SlideChange>;
  created_at: string;
};

export const SLIDE_EVENT_COLUMNS =
  'id, slide_id, slide_title, action, changes, created_at';

export const ACTION_LABEL: Record<SlideEventAction, string> = {
  create: '새로 만듦',
  update: '저장',
  activate: '노출 켬',
  deactivate: '노출 끔',
  duplicate: '복제',
  delete: '삭제',
  reorder: '순서 바꿈',
};

/** 기록에 보이는 칸 이름 — 어드민 입력 칸 이름과 같게(BeltFields·SlideCard) */
export const FIELD_LABEL: Record<string, string> = {
  eyebrow: '윗줄 작은 글씨',
  line1: '큰 문장 첫 줄',
  line2: '큰 문장 둘째 줄',
  sub: '아랫줄',
  href: '누르면 가는 곳',
  cta: '통계 이름',
  bg: '띠지 색',
  fg: '띠지 글자색',
  audience: '노출 대상',
  starts_at: '시작',
  ends_at: '종료',
  belt_style: '띠지',
  cover_style: '표지',
  cover_bg: '표지 색',
  cover_fg: '표지 글자색',
  cover_title: '표지 제목',
  show_number: '큰 숫자',
  art_url: '표지 그림',
  art_x: '그림 가로 위치',
  art_y: '그림 세로 위치',
  art_w: '그림 크기',
  belt_art_url: '띠지 배경 그림',
};

const TIME_KEYS = new Set(['starts_at', 'ends_at']);

/** 같은 값인가 — 시각은 표기("+00:00"·"+09:00")가 달라도 같은 순간이면 같다 */
const sameValue = (key: string, a: unknown, b: unknown): boolean => {
  const norm = (v: unknown) => (v === '' || v === undefined ? null : v);
  const x = norm(a);
  const y = norm(b);
  if (TIME_KEYS.has(key) && typeof x === 'string' && typeof y === 'string') {
    return new Date(x).getTime() === new Date(y).getTime();
  }
  return x === y;
};

/**
 * 저장 전 행과 저장할 값을 견줘 바뀐 칸만 돌려준다.
 * next 에 있는 칸만 본다(id·클릭 수·순서처럼 저장 폼이 안 건드리는 칸은 제외).
 */
export const diffSlide = (
  before: HeroSlideRow,
  next: Partial<Record<keyof HeroSlideRow, unknown>>
): Record<string, SlideChange> => {
  const changes: Record<string, SlideChange> = {};
  for (const [key, to] of Object.entries(next)) {
    const from = before[key as keyof HeroSlideRow];
    if (!sameValue(key, from, to)) changes[key] = { from, to };
  }
  return changes;
};

/** 값 하나를 사람이 읽는 글로 */
const showValue = (key: string, v: unknown): string => {
  if (v === null || v === undefined || v === '') return '(비움)';
  if (TIME_KEYS.has(key) && typeof v === 'string')
    return isoToKstInput(v).replace('T', ' ');
  if (key.endsWith('art_url')) return '그림';
  if (typeof v === 'boolean') return v ? '보임' : '숨김';
  if (key === 'audience')
    return (
      { all: '모두', guest: '비회원', member: '회원' }[String(v)] ?? String(v)
    );
  if (key === 'belt_style' || key === 'cover_style')
    return v === 'custom' ? '직접' : '기본';
  return String(v);
};

/**
 * 바뀐 칸 한 줄씩 — "큰 문장 첫 줄: 『어린 왕자』를 → 『어린 왕자』,"
 * 그림은 주소 대신 "그림 넣음·바꿈·뺌"으로 줄인다.
 */
export const describeChanges = (
  changes: Record<string, SlideChange>
): string[] =>
  Object.entries(changes).map(([key, { from, to }]) => {
    const label = FIELD_LABEL[key] ?? key;
    if (key.endsWith('art_url')) {
      const verb = !from ? '넣음' : !to ? '뺌' : '바꿈';
      return `${label} ${verb}`;
    }
    return `${label}: ${showValue(key, from)} → ${showValue(key, to)}`;
  });

/** "2026-11-27T08:55:00Z" → "11.27 17:55" (한국 시간) */
export const eventTime = (iso: string): string => {
  const [date, time] = isoToKstInput(iso).split('T');
  if (!date) return '';
  const [, m, d] = date.split('-');
  return `${Number(m)}.${Number(d)} ${time}`;
};

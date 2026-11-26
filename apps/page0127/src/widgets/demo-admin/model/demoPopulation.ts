import { addDays } from '@/shared/lib/admin/dateRange';
import { toKstDateKey } from '@/shared/lib/date';

/**
 * 데모 어드민이 쓰는 "가상의 회원들" — DB 를 전혀 읽지 않고 코드 안에서 만든다.
 *
 * 왜 숫자를 직접 적지 않고 사람·방문·책 기록을 만들어 내나:
 * 실제 어드민은 원본 기록(방문 한 줄, 책 한 권)을 모아 lib 의 순수 함수(summarizeActivity·
 * computeRetention·computeFunnel …)로 센다. 데모도 같은 함수에 가상의 원본을 넣으면
 *   1) 카드·추이·퍼널·재방문 숫자가 서로 맞물린다(DAU 합계와 추이 막대가 어긋나지 않는다)
 *   2) 기간 선택(1주·1달)을 바꿔도 그 기간에 맞는 숫자가 나온다
 *   3) 리뷰어가 보는 계산이 실제 운영 화면과 같은 코드다
 *
 * 숫자는 일부러 작다(하루 방문 열 명 안팎, HJ 결정 2026-11-26) — 부풀린 숫자는 믿음을 깎는다.
 * 같은 날에는 늘 같은 숫자가 나오도록 씨앗(seed)이 고정된 의사 난수를 쓴다.
 */

/** 같은 씨앗이면 같은 수열 — Math.random 을 쓰면 새로고침마다 숫자가 바뀐다 */
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** 가상의 서비스가 열린 지 며칠 — 4주 재방문(W4) 코호트가 채워질 만큼 길게 */
const HISTORY_DAYS = 120;

/** 저녁(21~23시)에 가장 많이, 점심에 조금 — 책 기록 서비스다운 방문 시각 */
const VISIT_HOUR_WEIGHTS = [
  1, 0, 0, 0, 0, 0, 1, 2, 3, 2, 2, 3, 5, 4, 2, 2, 2, 3, 4, 5, 6, 8, 9, 6,
];

export type DemoMember = { id: string; createdAt: string };
export type DemoVisit = {
  user_id: string;
  visit_date: string;
  first_visit_at: string;
};
export type DemoBook = {
  user_id: string;
  created_at: string;
  status: string;
  one_line_review: string | null;
  completed_date: string | null;
};

export type DemoPopulation = {
  members: DemoMember[];
  visits: DemoVisit[];
  books: DemoBook[];
  /** 알림(웹푸시)을 켠 회원 */
  pushUserIds: string[];
};

/** KST 날짜 + 시(0~23) → ISO 시각 */
const kstIso = (dateKey: string, hour: number, minute: number): string =>
  new Date(
    `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`
  ).toISOString();

const pickHour = (rand: () => number): number => {
  const total = VISIT_HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let h = 0; h < 24; h++) {
    r -= VISIT_HOUR_WEIGHTS[h];
    if (r < 0) return h;
  }
  return 21;
};

/**
 * @param now 기준 시각 — 오늘(KST)이 가상 기록의 마지막 날이 된다.
 *            오늘 기록은 지금 시각까지만 만든다(밤 10시 방문이 오후 3시에 보이면 안 된다).
 */
export const buildDemoPopulation = (now: Date): DemoPopulation => {
  const today = toKstDateKey(now);
  const start = addDays(today, -HISTORY_DAYS);
  // 날짜를 씨앗에 섞지 않는다 — 날짜와 무관하게 "n일 전"의 모양이 같아 하루 사이 숫자가 크게 튀지 않는다
  const rand = mulberry32(20260127);
  const nowMs = now.getTime();

  const members: DemoMember[] = [];
  const visits: DemoVisit[] = [];
  const books: DemoBook[] = [];
  const pushUserIds: string[] = [];

  for (let d = 0; d <= HISTORY_DAYS; d++) {
    const day = addDays(start, d);
    // 하루 가입 0~2명, 뒤로 갈수록 조금씩 는다(홍보를 시작한 서비스처럼)
    const growth = 0.25 + (d / HISTORY_DAYS) * 0.45;
    const signups = (rand() < growth ? 1 : 0) + (rand() < growth / 4 ? 1 : 0);

    for (let s = 0; s < signups; s++) {
      const hour = pickHour(rand);
      const minute = Math.floor(rand() * 60);
      const createdAt = kstIso(day, hour, minute);
      if (new Date(createdAt).getTime() > nowMs) continue;

      const id = `demo-member-${members.length + 1}`;
      members.push({ id, createdAt });
      // 사람마다 얼마나 자주 오는지 — 대부분은 가끔, 몇 명은 거의 매일
      const habit = rand() < 0.2 ? 0.55 + rand() * 0.3 : 0.05 + rand() * 0.25;
      if (rand() < 0.3) pushUserIds.push(id);

      // 방문: 가입일은 반드시, 이후는 습관 × 시간이 지날수록 조금 식는 정도
      for (let v = 0; v <= HISTORY_DAYS - d; v++) {
        const visitDay = addDays(day, v);
        const fade = Math.max(0.35, 1 - v / 90);
        // 가입 다음 며칠은 둘러보러 한 번 더 오는 사람이 많다(D1 재방문이 0% 로만 보이지 않게)
        const curious = v <= 2 ? 0.3 : 0;
        if (v > 0 && rand() >= habit * fade + curious) continue;
        const visitHour = v === 0 ? hour : pickHour(rand);
        const at = kstIso(visitDay, visitHour, Math.floor(rand() * 60));
        if (new Date(at).getTime() > nowMs) continue;
        visits.push({ user_id: id, visit_date: visitDay, first_visit_at: at });
      }

      // 책: 70% 는 가입 당일 첫 책, 나머지 중 절반은 며칠 뒤, 나머지는 아직 없음
      const firstBookDelay =
        rand() < 0.7 ? 0 : rand() < 0.5 ? 1 + Math.floor(rand() * 10) : null;
      if (firstBookDelay === null) continue;
      const bookCount = 1 + Math.floor(habit * 12 * rand());
      for (let b = 0; b < bookCount; b++) {
        const offset = firstBookDelay + Math.floor(b * (3 + rand() * 6));
        const bookDay = addDays(day, offset);
        if (bookDay > today) break;
        const at = kstIso(bookDay, pickHour(rand), Math.floor(rand() * 60));
        if (new Date(at).getTime() > nowMs) break;
        const completed = rand() < 0.6;
        books.push({
          user_id: id,
          created_at: at,
          status: completed ? 'completed' : 'reading',
          one_line_review: completed && rand() < 0.45 ? '한 줄 남김' : null,
          completed_date: completed ? bookDay : null,
        });
      }
    }
  }

  return { members, visits, books, pushUserIds };
};

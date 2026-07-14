import { createClient } from '@/shared/config/supabase/server';
import { formatFullDate } from '@/shared/lib/date';

/**
 * 오늘의 기록 — 매일 바뀌는 문자열을 화면에 하나 박는다.
 *
 * 왜:
 *   밀리의서재는 "07월 13일 월요일 업데이트"라고 적는다.
 *   **날짜를 박는다는 건 누군가 갱신 책임을 지고 있다는 선언**이다.
 *   AI 목업은 시간을 못 박는다 — 박으면 틀리기 때문이다. (00_docs/07 §1.3-①)
 *
 * ⚠️ "오늘 0권 완독"을 쓰지 않는 이유:
 *   완독이 0건인 날 "오늘 0권이 완독됐어요"라고 적으면 살아 있는 서비스가 아니라
 *   **죽은 서비스라는 자백**이 된다. 원래 의도와 정반대다.
 *   → 오늘 기록이 있으면 오늘 숫자를, 없으면 누적으로 물러난다.
 *      요일이 붙은 날짜는 데이터와 무관하게 항상 바뀐다.
 */

// 서버 시각이 UTC라 그냥 Date를 쓰면 한국의 '오늘'과 어긋난다.
const getKstToday = (): string => {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kstNow.toISOString().slice(0, 10); // YYYY-MM-DD
};

export const TodayStrip = async () => {
  const supabase = await createClient();
  const today = getKstToday();

  // 오늘 완독 수 / 누적 완독 수 — 서로 독립이므로 병렬
  const [todayRes, totalRes] = await Promise.all([
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('completed_date', today),
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
  ]);

  const todayCount = todayRes.count ?? 0;
  const totalCount = totalRes.count ?? 0;

  // 기록이 하나도 없으면 숫자를 자랑할 게 없다 — 스트립 자체를 그리지 않는다
  if (totalCount === 0) return null;

  const headline =
    todayCount > 0
      ? `오늘 ${todayCount}권이 완독됐어요`
      : `지금까지 ${totalCount.toLocaleString()}권이 쌓였어요`;

  return (
    <div className='flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 border-y border-line-soft py-3 text-sm'>
      <span className='font-medium text-text-body'>{headline}</span>
      <time
        dateTime={today}
        className='text-xs tabular-nums text-text-faint'
      >
        {formatFullDate(today)}
      </time>
    </div>
  );
};

import { ChevronRight } from 'lucide-react';

type TodaySentenceBannerProps = {
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' */
  today: string;
};

/**
 * 서재 맨 위 — 오늘의 문장을 아직 안 펼친 날에만 뜨는 배너. 누르면 캘린더 오늘 칸으로 내려간다.
 *
 * 펼친 뒤에는 부모가 그리지 않는다(매일 보는 자리라 할 일이 끝나면 비워 둔다 — HJ, 2026-11-12).
 * 펼친 문장은 캘린더 오늘 칸에서 다시 본다.
 * 면은 디자인 시스템 틴트(tint-blue)+1px 선, 유채색은 주 색 링크와 책 리본 한 점뿐이다.
 * 오른쪽 책은 펼치기 애니메이션(DailySentenceBook)의 남색 표지와 같은 모양 — 이 책이 펼쳐진다는 연결.
 */
export const TodaySentenceBanner = ({ today }: TodaySentenceBannerProps) => {
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));

  return (
    <a
      href='#reading-calendar'
      className='tint-blue group flex items-center gap-4 overflow-hidden rounded-2xl border border-line-soft py-4 pl-5 pr-5 text-text-strong transition-colors hover:border-primary/30'
    >
      <span className='min-w-0 flex-1'>
        <span className='block text-xs text-text-subtle'>
          {month}월 {day}일 · 하루 한 문장
        </span>
        <span className='mt-1 block break-keep text-base font-bold'>
          오늘의 문장, 아직 안 펼쳤어요
        </span>
        <span className='mt-1.5 inline-flex items-center gap-0.5 text-sm font-medium text-primary'>
          펼쳐 보기
          <ChevronRight
            className='size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none'
            aria-hidden
          />
        </span>
      </span>
      <ClosedBook />
    </a>
  );
};

/** 남색 표지 + 민트 리본 — 장식이라 읽히지 않게 숨긴다 */
const ClosedBook = () => (
  <span aria-hidden className='relative mr-1 h-16 w-12 shrink-0 rotate-6'>
    <span className='absolute inset-0 rounded-[2px_6px_6px_2px] bg-[var(--navy-900)] shadow-[2px_3px_8px_rgb(20_41_78/0.18)]' />
    {/* 책등 선 */}
    <span className='absolute inset-y-0 left-1.5 border-l border-white/20' />
    {/* 표지 제목 자리 두 줄 */}
    <span className='absolute left-3 right-2 top-4 h-0.5 rounded bg-white/40' />
    <span className='absolute left-3 right-4 top-6 h-0.5 rounded bg-white/25' />
    {/* 아래로 늘어진 리본 — 끝을 V 로 판다 */}
    <span className='absolute -bottom-2 right-3 h-5 w-2 bg-[var(--mint)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)]' />
  </span>
);

import { Skeleton } from '@repo/ui';

/**
 * 어드민 공통 로딩 화면 — 메뉴를 누르면 왼쪽 메뉴는 그대로 두고 본문 자리만 바로 바뀐다.
 *
 * 어드민 화면은 전부 서버에서 DB·외부 API(GA·Sentry·OpenAI)를 읽고 나서 그려서,
 * 이 파일이 없으면 다 받을 때까지 이전 화면에 멈춘 것처럼 보였다.
 * 화면마다 모양이 달라 제목·숫자 타일·본문 덩어리만 흉내 낸다.
 */
export default function AdminLoading() {
  return (
    <div className='space-y-6' aria-busy='true' aria-label='불러오는 중'>
      <Skeleton className='h-6 w-32' />
      <div className='grid gap-3 sm:grid-cols-4'>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className='h-20' />
        ))}
      </div>
      <Skeleton className='h-64' />
      <Skeleton className='h-40' />
    </div>
  );
}

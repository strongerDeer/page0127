import { cn } from '@/shared/lib/utils';

/**
 * 안 본 소식 표시 — 작은 빨간 점. 부모에 relative 가 있어야 한다.
 * 민트는 "지금 페이지" 표시(목차의 민트 점)라 겹치지 않게 알림 배지와 같은 빨강을 쓴다.
 * 점만으로는 화면 읽기 프로그램이 알 수 없으니 숨은 글자를 같이 둔다.
 */
export const NewsDot = ({
  label = '새 소식',
  className,
}: {
  label?: string;
  className?: string;
}) => (
  <>
    <span
      aria-hidden='true'
      className={cn(
        'pointer-events-none absolute size-2 rounded-full bg-destructive ring-2 ring-card',
        className
      )}
    />
    <span className='sr-only'>({label} 있음)</span>
  </>
);

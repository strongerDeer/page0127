/**
 * @repo/ui — page0127 디자인 시스템의 공개 표면
 *
 * 여기에 없는 것은 시스템이 아니다. 앱은 이 진입점으로만 컴포넌트를 가져가고,
 * 내부 경로(`@repo/ui/src/components/...`)를 직접 파고들지 않는다 —
 * 그래야 안을 고칠 때 무엇이 깨지는지 이 파일만 보면 안다.
 *
 * 목록의 순서는 Storybook 의 섹션 구성과 같다(Action → Form → Overlay →
 * Feedback → Navigation → Surface → Domain). 어디에 무엇이 있는지 찾는
 * 경로를 코드와 문서에서 다르게 만들지 않으려는 것이다.
 */

export { cn } from './lib/cn';

/* Action */
export { Button, buttonVariants } from './components/button';

/* Form */
export { Input } from './components/input';
export { Label } from './components/label';
export * from './components/select';
export { Switch } from './components/switch';
export { Textarea } from './components/textarea';

/* Overlay */
export * from './components/alert-dialog';
export * from './components/dialog';
export * from './components/dropdown-menu';
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './components/popover';

/* Feedback */
export { Progress } from './components/progress';
export { Skeleton } from './components/skeleton';
export { Toaster } from './components/sonner';

/* Navigation */
export * from './components/pagination';

/* Surface */
export { Avatar, AvatarFallback, AvatarImage } from './components/avatar';
export * from './components/card';
export { PageContainer } from './components/PageContainer';
export { PageHeader } from './components/PageHeader';
export { ScrollArea, ScrollBar } from './components/scroll-area';

/* Feedback — 상태 표시 */
export { ErrorBoundary } from './components/ErrorBoundary';
export { ErrorFallback } from './components/ErrorFallback';
export { Spinner } from './components/Spinner';

/* Domain — 이 서비스가 책을 다루기 때문에 존재하는 것들.
   범용 컴포넌트 라이브러리라면 없었을 자리다. */
export { BookCover } from './components/BookCover';
export { ReadCountBadge } from './components/ReadCountBadge';

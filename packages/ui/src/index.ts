/**
 * @repo/ui — page0127 디자인 시스템의 공개 표면
 *
 * 여기에 없는 것은 시스템이 아니다. 앱은 이 진입점으로만 컴포넌트를 가져가고,
 * 내부 경로(`@repo/ui/src/components/...`)를 직접 파고들지 않는다 —
 * 그래야 안을 고칠 때 무엇이 깨지는지 이 파일만 보면 안다.
 */

export { Button, buttonVariants } from './components/button';
export { cn } from './lib/cn';

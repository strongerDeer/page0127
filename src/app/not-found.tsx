'use client';
import Button from '@components/shared/Button';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>
      <Button onClick={() => router.back()}>이전페이지로 돌아가기</Button>
    </div>
  );
}

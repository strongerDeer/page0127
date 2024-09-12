'use client';
import Input from '@components/form/Input';
import { useRouter } from 'next/navigation';

export default function Search() {
  const router = useRouter();

  return (
    <Input
      label="책 검색"
      hiddenLabel
      placeholder="도서를 검색해보세요"
      onFocus={() => router.push('/book/search')}
    />
  );
}

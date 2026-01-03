'use client';

import { useRef, useState } from 'react';

import Image from 'next/image';

import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

type AvatarUploadProps = {
  currentPhotoUrl: string | null;
  onFileSelect: (file: File | null) => void;
};

/**
 * 프로필 이미지 업로드 컴포넌트
 *
 * 학습 포인트:
 * - File 객체를 상태로 관리
 * - FileReader로 이미지 미리보기 생성
 * - 실제 업로드는 폼 제출 시 부모 컴포넌트에서 처리
 */
export const AvatarUpload = ({
  currentPhotoUrl,
  onFileSelect,
}: AvatarUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 학습 포인트: 미사용 변수는 언더스코어(_)로 시작해서 lint 경고 방지
  // 또는 필요없다면 완전히 제거
  const [_selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);

  // 파일 선택 버튼 클릭
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. 파일 유효성 검사
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('JPG, PNG, WEBP, GIF 형식의 이미지만 업로드 가능합니다.');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 2. FileReader로 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 3. 파일 객체 저장 및 부모 컴포넌트에 전달
    setSelectedFile(file);
    onFileSelect(file);
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-4'>
      {/* 이미지 미리보기 */}
      <div className='flex items-center gap-4'>
        <div className='relative h-24 w-24 overflow-hidden rounded-full bg-gray-200'>
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt='프로필 이미지'
              fill
              sizes='96px'
              className='object-cover transition-opacity duration-300'
              priority
            />
          ) : (
            <div className='flex h-full items-center justify-center text-gray-400'>
              <svg
                className='h-12 w-12'
                fill='currentColor'
                viewBox='0 0 24 24'
              >
                <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
              </svg>
            </div>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <Button type='button' variant='outline' onClick={handleButtonClick}>
            이미지 선택
          </Button>

          {previewUrl && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleRemoveImage}
              className='text-red-600 hover:text-red-700'
            >
              이미지 제거
            </Button>
          )}
        </div>
      </div>

      {/* 파일 입력 (숨김) */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,image/gif'
        onChange={handleFileChange}
        className='hidden'
      />

      {/* 안내 문구 */}
      <p className='text-xs text-gray-500'>
        JPG, PNG, WEBP, GIF (최대 5MB) · 저장 버튼을 눌러야 업로드됩니다
      </p>
    </div>
  );
};

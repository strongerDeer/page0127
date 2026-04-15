'use client';

import { useEffect, useId, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import { updateProfile } from '@/entities/profile/api/updateProfile';

import { DeleteAccountDialog } from '@/features/auth/ui/DeleteAccountDialog';
import { useAvatarStorage } from '@/features/profile/api/useAvatarStorage';

import { AvatarUpload } from './AvatarUpload';

import type { Profile } from '@/entities/profile/types';

type ProfileSettingsFormProps = {
  profile: Profile;
};

type ProfileSettingsFormPhotoProps = {
  currentPhotoUrl: string | null;
  onFileSelect: (file: File | null) => void;
};

type ProfileSettingsFormDangerZoneProps = {
  userEmail: string;
};

const ProfileSettingsFormPhoto = ({
  currentPhotoUrl,
  onFileSelect,
}: ProfileSettingsFormPhotoProps) => (
  <div className='space-y-2'>
    <Label>프로필 이미지</Label>
    <AvatarUpload
      currentPhotoUrl={currentPhotoUrl}
      onFileSelect={onFileSelect}
    />
  </div>
);

const ProfileSettingsFormDangerZone = ({
  userEmail,
}: ProfileSettingsFormDangerZoneProps) => (
  <Card className='mt-6 border-red-200 bg-red-50 p-6'>
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold text-red-900'>위험 영역</h3>
        <p className='mt-1 text-sm text-red-700'>
          계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
        </p>
      </div>
      <DeleteAccountDialog userEmail={userEmail} />
    </div>
  </Card>
);

/**
 * 프로필 설정 폼 컴포넌트
 *
 * 학습 포인트:
 * - Client Component: 폼 상태 관리
 * - useState로 입력값 관리
 * - 낙관적 업데이트 (UI 먼저 업데이트 후 서버 동기화)
 * - Toast 알림으로 사용자 피드백
 * - useEffect로 클라이언트 전용 상태 관리 (Hydration 에러 방지)
 */
export const ProfileSettingsForm = ({ profile }: ProfileSettingsFormProps) => {
  const router = useRouter();
  const { uploadAvatar, removeAvatar } = useAvatarStorage();

  // 폼 상태 관리
  const formId = useId();
  const ids = {
    email: `${formId}-email`,
    username: `${formId}-username`,
    nickname: `${formId}-nickname`,
    bio: `${formId}-bio`,
  };

  const [nickname, setNickname] = useState(profile.nickname || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 현재 표시 중인 프로필 이미지 (낙관적 업데이트용)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(profile.photo_url);

  // 클라이언트 전용 상태 (Hydration 에러 방지)
  const [profileUrl, setProfileUrl] = useState('');

  useEffect(() => {
    // 클라이언트에서만 실행
    setProfileUrl(`${window.location.origin}/${profile.username}`);
  }, [profile.username]);

  // 이미지 제거 여부 추적
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  // 파일 선택 핸들러 (이미지 제거 포함)
  const handleFileSelect = (file: File | null) => {
    if (file === null && currentPhotoUrl) {
      setIsImageRemoved(true);
      setCurrentPhotoUrl(null); // 낙관적으로 즉시 제거
    } else {
      setIsImageRemoved(false);
    }
    setSelectedFile(file);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let photoUrl: string | undefined | null;

      if (isImageRemoved) {
        await removeAvatar(profile.photo_url);
        photoUrl = null;
      } else if (selectedFile) {
        photoUrl = await uploadAvatar(selectedFile, profile.id, profile.photo_url);
      }

      const updateData: {
        nickname?: string;
        bio?: string;
        photo_url?: string | null;
      } = {
        nickname: nickname.trim() || undefined,
        bio: bio.trim() || undefined,
      };

      if (isImageRemoved) {
        updateData.photo_url = null;
      } else if (photoUrl) {
        updateData.photo_url = photoUrl;
      }

      const success = await updateProfile(profile.id, updateData);

      if (success) {
        toast.success('프로필이 저장되었습니다.');
        if (photoUrl !== undefined) setCurrentPhotoUrl(photoUrl);
        setSelectedFile(null);
        setIsImageRemoved(false);
        setTimeout(() => router.refresh(), 100);
      } else {
        toast.error('프로필 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      toast.error('예상치 못한 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className='p-6'>
        <div className='space-y-6'>
          {/* 제목 */}
          <div>
            <h2 className='text-2xl font-bold'>프로필 설정</h2>
            <p className='mt-1 text-sm text-gray-600'>
              공개 서재에 표시될 정보를 수정할 수 있습니다.
            </p>
          </div>

          {/* 프로필 이미지 */}
          <ProfileSettingsForm.Photo
            currentPhotoUrl={currentPhotoUrl}
            onFileSelect={handleFileSelect}
          />

          {/* 이메일 (읽기 전용) */}
          <div className='space-y-2'>
            <Label htmlFor={ids.email}>이메일</Label>
            <Input
              id={ids.email}
              type='email'
              value={profile.email || ''}
              disabled
              className='bg-gray-100'
            />
            <p className='text-xs text-gray-500'>
              이메일은 변경할 수 없습니다.
            </p>
          </div>

          {/* Username (읽기 전용) */}
          <div className='space-y-2'>
            <Label htmlFor={ids.username}>Username</Label>
            <Input
              id={ids.username}
              type='text'
              value={profile.username || ''}
              disabled
              className='bg-gray-100'
            />
            <p className='text-xs text-gray-500'>
              공개 서재 URL: {profileUrl || `/${profile.username}`}
            </p>
          </div>

          {/* 닉네임 */}
          <div className='space-y-2'>
            <Label htmlFor={ids.nickname}>닉네임</Label>
            <Input
              id={ids.nickname}
              type='text'
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder='닉네임을 입력하세요'
              maxLength={50}
            />
            <p className='text-xs text-gray-500'>
              공개 서재에 표시될 이름입니다. (최대 50자)
            </p>
          </div>

          {/* 한줄 소개 */}
          <div className='space-y-2'>
            <Label htmlFor={ids.bio}>한줄 소개</Label>
            <Textarea
              id={ids.bio}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder='자신을 소개하는 한줄을 작성해보세요.'
              rows={3}
              maxLength={200}
              className='resize-none'
            />
            <p className='text-xs text-gray-500'>{bio.length}/200자</p>
          </div>

          {/* 저장 버튼 */}
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.back()}
            >
              취소
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </Card>

      <ProfileSettingsForm.DangerZone userEmail={profile.email || ''} />
    </form>
  );
};

ProfileSettingsForm.Photo = ProfileSettingsFormPhoto;
ProfileSettingsForm.DangerZone = ProfileSettingsFormDangerZone;

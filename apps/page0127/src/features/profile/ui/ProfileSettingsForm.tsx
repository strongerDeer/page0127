'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import { updateProfile } from '@/entities/profile/api/updateProfile';

import { DeleteAccountDialog } from '@/features/auth/ui/DeleteAccountDialog';

import { AvatarUpload } from './AvatarUpload';

import type { Profile } from '@/entities/profile/types';

type ProfileSettingsFormProps = {
  profile: Profile;
};

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

  // 폼 상태 관리
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
      // 이미지 제거 (파일이 null이고 기존 이미지가 있는 경우)
      setIsImageRemoved(true);
      // UI에서 즉시 제거 (깜박임 없음)
      setCurrentPhotoUrl(null);
    } else {
      setIsImageRemoved(false);
    }
    setSelectedFile(file);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 로딩 상태 활성화
    setIsSubmitting(true);

    try {
      let photoUrl: string | undefined | null;
      const { createClient } = await import('@/shared/config/supabase/client');
      const supabase = createClient();

      // 2. 이미지 제거가 요청된 경우
      if (isImageRemoved && currentPhotoUrl) {
        try {
          // URL에서 파일 경로 추출
          // Supabase Storage URL 형식:
          // https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
          let oldFilePath: string | null = null;

          // 방법 1: /storage/v1/object/public/profiles/ 이후 경로
          if (currentPhotoUrl.includes('/storage/v1/object/public/profiles/')) {
            const urlParts = currentPhotoUrl.split(
              '/storage/v1/object/public/profiles/'
            );
            oldFilePath = urlParts.length > 1 ? urlParts[1] : null;
          }
          // 방법 2: /object/public/profiles/ 이후 경로 (짧은 형식)
          else if (currentPhotoUrl.includes('/object/public/profiles/')) {
            const urlParts = currentPhotoUrl.split('/object/public/profiles/');
            oldFilePath = urlParts.length > 1 ? urlParts[1] : null;
          }
          // 방법 3: 단순히 /profiles/ 이후 경로
          else if (currentPhotoUrl.includes('/profiles/')) {
            const urlParts = currentPhotoUrl.split('/profiles/');
            oldFilePath = urlParts.length > 1 ? urlParts[1] : null;
          }

          if (oldFilePath) {
            console.warn('삭제할 파일 경로:', oldFilePath);
            const { data: removeData, error: removeError } =
              await supabase.storage.from('profiles').remove([oldFilePath]);

            console.warn('삭제 결과 data:', removeData);
            console.warn('삭제 결과 error:', removeError);

            if (removeError) {
              console.error('Storage 삭제 에러:', removeError);
              toast.error(`이미지 삭제 실패: ${removeError.message}`);
            } else {
              console.warn('Storage 파일 삭제 성공');
            }
          }
          // DB에서 photo_url을 null로 설정하기 위해 빈 문자열 대신 null 사용
          photoUrl = null;
        } catch (error) {
          console.error('이미지 삭제 실패:', error);
          toast.error('이미지 삭제에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }
      }
      // 3. 새 이미지 파일이 선택되었으면 업로드
      else if (selectedFile) {
        // 3-1. 기존 이미지가 있으면 삭제
        if (profile.photo_url) {
          try {
            // URL에서 파일 경로 추출
            // 예: https://xxx.supabase.co/storage/v1/object/public/profiles/avatars/file.png
            // -> avatars/file.png
            const urlParts = profile.photo_url.split(
              '/storage/v1/object/public/profiles/'
            );
            const oldFilePath = urlParts.length > 1 ? urlParts[1] : null;

            if (oldFilePath) {
              console.warn('기존 파일 삭제:', oldFilePath);
              const { data: removeData, error: removeError } =
                await supabase.storage.from('profiles').remove([oldFilePath]);

              console.warn('기존 파일 삭제 결과 data:', removeData);
              console.warn('기존 파일 삭제 결과 error:', removeError);

              if (removeError) {
                console.error('Storage 삭제 에러:', removeError);
              } else {
                console.warn('기존 파일 삭제 성공');
              }
            }
          } catch (error) {
            console.error('기존 이미지 삭제 실패:', error);
            // 삭제 실패해도 업로드는 계속 진행
          }
        }

        // 2-2. 파일명 생성 (userId + timestamp + 확장자)
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // 2-3. Supabase Storage에 업로드
        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('업로드 에러:', uploadError);
          toast.error('이미지 업로드에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }

        // 2-4. Public URL 생성
        const {
          data: { publicUrl },
        } = supabase.storage.from('profiles').getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // 4. 프로필 업데이트
      const updateData: {
        nickname?: string;
        bio?: string;
        photo_url?: string | null;
      } = {
        nickname: nickname.trim() || undefined,
        bio: bio.trim() || undefined,
      };

      // 이미지가 제거되었거나 새로 업로드된 경우에만 photo_url 업데이트
      if (isImageRemoved) {
        updateData.photo_url = null;
      } else if (photoUrl) {
        updateData.photo_url = photoUrl;
      }

      const success = await updateProfile(profile.id, updateData);

      if (success) {
        toast.success('프로필이 저장되었습니다.');
        // 5. 낙관적 업데이트: UI 먼저 업데이트 (깜박임 없음)
        if (photoUrl !== undefined) {
          setCurrentPhotoUrl(photoUrl);
        }
        setSelectedFile(null);
        setIsImageRemoved(false);
        // 6. 백그라운드에서 서버 데이터 동기화
        setTimeout(() => {
          router.refresh();
        }, 100);
      } else {
        toast.error('프로필 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      toast.error('예상치 못한 오류가 발생했습니다.');
    } finally {
      // 5. 로딩 상태 해제
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
          <div className='space-y-2'>
            <Label>프로필 이미지</Label>
            <AvatarUpload
              currentPhotoUrl={currentPhotoUrl}
              onFileSelect={handleFileSelect}
            />
          </div>

          {/* 이메일 (읽기 전용) */}
          <div className='space-y-2'>
            <Label htmlFor='email'>이메일</Label>
            <Input
              id='email'
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
            <Label htmlFor='username'>Username</Label>
            <Input
              id='username'
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
            <Label htmlFor='nickname'>닉네임</Label>
            <Input
              id='nickname'
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
            <Label htmlFor='bio'>한줄 소개</Label>
            <Textarea
              id='bio'
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

      {/* 위험 영역: 계정 삭제 */}
      <Card className='p-6 mt-6 border-red-200 bg-red-50'>
        <div className='space-y-4'>
          <div>
            <h3 className='text-lg font-semibold text-red-900'>위험 영역</h3>
            <p className='mt-1 text-sm text-red-700'>
              계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수
              없습니다.
            </p>
          </div>
          <DeleteAccountDialog userEmail={profile.email || ''} />
        </div>
      </Card>
    </form>
  );
};

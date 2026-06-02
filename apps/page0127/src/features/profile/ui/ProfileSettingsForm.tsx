'use client';

import { useActionState, useEffect, useId, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Globe, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import { useLogout } from '@/features/auth/api/useLogout';
import { DeleteAccountDialog } from '@/features/auth/ui/DeleteAccountDialog';
import {
  type ProfileActionState,
  updateProfileAction,
} from '@/features/profile/api/updateProfileAction';

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

type ProfileSettingsFormMyAccountProps = {
  username: string | null;
  onLogout: () => void;
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

// 내 계정 진입점 — 모바일에서 사이드바 ProfileDropdown이 가려지므로 여기서 같은 액션 제공
const ProfileSettingsFormMyAccount = ({
  username,
  onLogout,
}: ProfileSettingsFormMyAccountProps) => (
  <Card className='mt-6 p-6 shadow-none'>
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold text-foreground'>내 계정</h3>
      <div className='space-y-1'>
        {username && (
          <Link
            href={`/${username}`}
            className='flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent'
          >
            <Globe className='size-4' />
            공개 서재 보기
          </Link>
        )}
        <button
          type='button'
          onClick={onLogout}
          className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent'
        >
          <LogOut className='size-4' />
          로그아웃
        </button>
      </div>
    </div>
  </Card>
);

const ProfileSettingsFormDangerZone = ({
  userEmail,
}: ProfileSettingsFormDangerZoneProps) => (
  <Card className='mt-6 border-destructive/20 bg-destructive/5 p-6'>
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold text-destructive'>위험 영역</h3>
        <p className='mt-1 text-sm text-destructive/80'>
          계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
        </p>
      </div>
      <DeleteAccountDialog userEmail={userEmail} />
    </div>
  </Card>
);

// useActionState 초기 상태 (아직 제출 전)
const initialState: ProfileActionState = { status: 'idle', message: '' };

/**
 * 프로필 설정 폼 컴포넌트
 *
 * 학습 포인트 (useActionState 전환):
 * - useState 5개(nickname/bio/selectedFile/isSubmitting/isImageRemoved) → useActionState 통합
 * - 제출은 onSubmit/preventDefault 대신 <form action={formAction}>
 * - 텍스트(nickname/bio)·파일(avatar)을 FormData가 자동 수집 → updateProfileAction에서 처리
 * - 성공/실패 후처리(toast·새로고침)는 state 변화를 useEffect로 감지
 * - 단, 글자수 카운터(bio)는 제어 상태로, 이미지 미리보기(displayPhotoUrl)는 파생값으로 둔다
 *   → "폼 제출만 Action으로, UX 표시는 state/파생값으로"
 */
export const ProfileSettingsForm = ({ profile }: ProfileSettingsFormProps) => {
  const router = useRouter();
  const { logout } = useLogout();

  const formId = useId();
  const ids = {
    email: `${formId}-email`,
    username: `${formId}-username`,
    nickname: `${formId}-nickname`,
    bio: `${formId}-bio`,
  };

  // 글자수 카운터 때문에 bio만 제어 컴포넌트로 유지 (name이 있으면 FormData엔 그대로 수집됨)
  const [bio, setBio] = useState(profile.bio || '');

  // 이미지 제거 의도 추적 (사용자가 '이미지 제거'를 눌렀는지)
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  // 공개 서재 URL (Hydration 에러 방지 — 클라이언트에서만 계산)
  const [profileUrl, setProfileUrl] = useState('');
  useEffect(() => {
    setProfileUrl(`${window.location.origin}/${profile.username}`);
  }, [profile.username]);

  // [state, formAction, isPending] — Server Action을 연결
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState
  );

  // 표시할 프로필 이미지 = 파생값 (useEffect로 setState 복사하지 않고 렌더 중 계산)
  // - 제거 의도면 null / 제출 성공 후엔 서버가 돌려준 URL / 그 외엔 원본
  // → "effect에서 state 동기화" 안티패턴 제거 (you-might-not-need-an-effect)
  const displayPhotoUrl = isImageRemoved
    ? null
    : state.status === 'success' && state.photoUrl !== undefined
      ? state.photoUrl
      : profile.photo_url;

  // action이 반환한 state가 바뀌면 후처리 (toast + 새로고침)
  // 제거 의도(isImageRemoved)는 여기서 리셋하지 않는다 — displayPhotoUrl이 이미
  // 올바르게 반영하고, 새 파일을 고르면 handleFileSelect에서 자연히 해제된다.
  useEffect(() => {
    if (state.status === 'success') {
      toast.success(state.message);
      setTimeout(() => router.refresh(), 100);
    } else if (state.status === 'error') {
      toast.error(state.message);
    }
  }, [state, router]);

  // 파일 선택/제거 → 제거 의도만 추적 (실제 File은 form이 name='avatar'로 수집)
  const handleFileSelect = (file: File | null) => {
    setIsImageRemoved(file === null && !!displayPhotoUrl);
  };

  return (
    // onSubmit 대신 action에 Server Action을 연결
    <form action={formAction}>
      <Card className='p-6'>
        <div className='space-y-6'>
          {/* 제목 */}
          <div>
            <h2 className='text-2xl font-bold'>프로필 설정</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              공개 서재에 표시될 정보를 수정할 수 있습니다.
            </p>
          </div>

          {/* 프로필 이미지 */}
          <ProfileSettingsForm.Photo
            currentPhotoUrl={displayPhotoUrl}
            onFileSelect={handleFileSelect}
          />

          {/* 아바타 메타데이터를 Action에 전달 (File 자체는 AvatarUpload의 name='avatar'가 수집) */}
          <input
            type='hidden'
            name='removeAvatar'
            value={String(isImageRemoved)}
          />
          <input
            type='hidden'
            name='currentPhotoUrl'
            value={profile.photo_url ?? ''}
          />

          {/* 이메일 (읽기 전용 — name 없음 → 전송 안 함) */}
          <div className='space-y-2'>
            <Label htmlFor={ids.email}>이메일</Label>
            <Input
              id={ids.email}
              type='email'
              value={profile.email || ''}
              disabled
              className='bg-muted'
            />
            <p className='text-xs text-muted-foreground'>
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
              className='bg-muted'
            />
            <p className='text-xs text-muted-foreground'>
              공개 서재 URL: {profileUrl || `/${profile.username}`}
            </p>
          </div>

          {/* 닉네임 — 비제어(defaultValue) + name 으로 FormData 자동 수집 */}
          <div className='space-y-2'>
            <Label htmlFor={ids.nickname}>닉네임</Label>
            <Input
              id={ids.nickname}
              name='nickname'
              type='text'
              defaultValue={profile.nickname || ''}
              placeholder='닉네임을 입력하세요'
              maxLength={50}
            />
            <p className='text-xs text-muted-foreground'>
              공개 서재에 표시될 이름입니다. (최대 50자)
            </p>
          </div>

          {/* 한줄 소개 — 글자수 카운터 때문에 제어 유지 (name 있으면 수집됨) */}
          <div className='space-y-2'>
            <Label htmlFor={ids.bio}>한줄 소개</Label>
            <Textarea
              id={ids.bio}
              name='bio'
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder='자신을 소개하는 한줄을 작성해보세요.'
              rows={3}
              maxLength={200}
              className='resize-none'
            />
            <p className='text-xs text-muted-foreground'>{bio.length}/200자</p>
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
            {/* isSubmitting 수동 관리 → isPending 자동 */}
            <Button type='submit' disabled={isPending}>
              {isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </Card>

      <ProfileSettingsForm.MyAccount
        username={profile.username}
        onLogout={logout}
      />

      <ProfileSettingsForm.DangerZone userEmail={profile.email || ''} />
    </form>
  );
};

ProfileSettingsForm.Photo = ProfileSettingsFormPhoto;
ProfileSettingsForm.MyAccount = ProfileSettingsFormMyAccount;
ProfileSettingsForm.DangerZone = ProfileSettingsFormDangerZone;

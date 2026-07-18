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
import { SubmitButton } from '@/shared/ui/SubmitButton';
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

// 내 계정 진입점 — 모바일에서 GNB ProfileDropdown 접근성이 낮으므로 여기서 같은 액션 제공
const ProfileSettingsFormMyAccount = ({
  username,
  onLogout,
}: ProfileSettingsFormMyAccountProps) => (
  <div className='mt-6 divide-y divide-line rounded-2xl bg-sunken px-5'>
    {username && (
      <Link
        href={`/${username}`}
        className='flex items-center gap-2.5 py-3.5 text-sm font-medium text-text-body transition-colors hover:text-text-strong'
      >
        <Globe className='size-4 text-text-faint' />
        공개 서재 보기
      </Link>
    )}
    <button
      type='button'
      onClick={onLogout}
      className='flex w-full items-center gap-2.5 py-3.5 text-left text-sm font-medium text-text-body transition-colors hover:text-text-strong'
    >
      <LogOut className='size-4 text-text-faint' />
      로그아웃
    </button>
  </div>
);

// 파괴적 액션은 빨간 패널로 소리치지 않는다 — 한 줄로 조용히 두고,
// 실제 경고는 확인 다이얼로그가 맡는다 (토스 설정 화면 문법)
const ProfileSettingsFormDangerZone = ({
  userEmail,
}: ProfileSettingsFormDangerZoneProps) => (
  <div className='mt-6 flex items-center justify-between gap-4 rounded-2xl bg-sunken px-5 py-4'>
    <p className='text-sm text-text-subtle'>
      계정을 삭제하면 모든 기록이 영구적으로 사라집니다.
    </p>
    <DeleteAccountDialog userEmail={userEmail} />
  </div>
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

  // [state, formAction] — Server Action을 연결
  // isPending은 제출 버튼(SubmitButton)이 useFormStatus로 직접 읽으므로 구조분해하지 않음
  const [state, formAction] = useActionState(updateProfileAction, initialState);

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
      {/* 제목은 카드 밖으로 — 카드 안 제목은 폼을 패널처럼 무겁게 만든다 */}
      <h1 className='heading-1 mb-6 text-text-strong'>설정</h1>

      <Card className='p-6'>
        <div className='space-y-5'>
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

          {/* 이메일 (읽기 전용 — name 없음 → 전송 안 함)
              disabled 스타일이 이미 "변경 불가"를 말하므로 헬퍼 문구는 생략 */}
          <div className='space-y-2'>
            <Label htmlFor={ids.email}>이메일</Label>
            <Input
              id={ids.email}
              type='email'
              value={profile.email || ''}
              disabled
              className='bg-muted'
            />
          </div>

          {/* 아이디 (읽기 전용) — 공개 서재 URL에 쓰인다 */}
          <div className='space-y-2'>
            <Label htmlFor={ids.username}>아이디</Label>
            <Input
              id={ids.username}
              type='text'
              value={profile.username || ''}
              disabled
              className='bg-muted'
            />
            <p className='text-xs text-text-faint'>
              공개 서재 주소 {profileUrl || `/${profile.username}`}
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
              placeholder='공개 서재에 표시될 이름'
              maxLength={50}
            />
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
            {/* useFormStatus가 부모 <form>의 pending을 직접 읽음 → isPending prop 불필요 */}
            <SubmitButton />
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

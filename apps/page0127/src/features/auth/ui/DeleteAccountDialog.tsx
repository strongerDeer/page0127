'use client';

import { useId, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Input,
  Label,
} from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
type DeleteAccountDialogProps = {
  /** 공개 서재 주소에 쓰이는 아이디. 확인 문구로 이걸 받는다 */
  username: string | null;
};

/**
 * 계정 삭제 다이얼로그 컴포넌트
 *
 * 학습 포인트:
 * - AlertDialog: 위험한 작업에 대한 확인 다이얼로그
 * - 2단계 확인: 버튼 클릭 + 아이디 입력
 * - 안전 장치: 잘못된 입력 시 삭제 불가
 * - 비동기 처리: API 호출 후 로그아웃 및 리다이렉트
 */
export const DeleteAccountDialog = ({ username }: DeleteAccountDialogProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 확인 입력 상태
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const inputId = useId();

  /*
    확인 문구를 이메일에서 아이디로 바꿨다.

    이메일은 없을 수 있다(카카오는 이메일 동의가 선택). 그런데 이 화면은
    `profile.email || ''` 를 받고 있어서, 이메일이 없으면 **빈 문자열끼리 일치해
    아무것도 입력하지 않은 채로 삭제 버튼이 열린다.** 되돌릴 수 없는 작업에서
    가장 나쁜 종류의 구멍이다.

    username 은 DB 가 항상 보장하고(NOT NULL 은 아니지만 발급이 보장된다),
    사용자에게도 자기 서재 주소(/hong)라 이메일보다 기억하기 쉽다.
    그래도 만에 하나 비어 있으면 어떤 입력과도 일치하지 않게 막는다.
  */
  const isConfirmed = Boolean(username) && confirmInput === username;

  // 계정 삭제 핸들러
  const handleDeleteAccount = async () => {
    if (!isConfirmed) {
      toast.error('아이디가 일치하지 않습니다.');
      return;
    }

    setIsDeleting(true);

    try {
      // API 호출: DELETE /api/auth/account
      const response = await apiClient.delete('/auth/account');

      if (response.status === 200) {
        toast.success('계정이 삭제되었습니다.');

        // 로그아웃 처리 (Supabase Auth)
        const { createClient } =
          await import('@/shared/config/supabase/client');
        const supabase = createClient();
        await supabase.auth.signOut();

        // 캐시를 비운다 — 지운 계정의 피드·댓글이 남아 있으면 안 된다.
        // staleTime(useCurrentUser 5분) 때문에 이걸 빠뜨리면 로그인된 화면이 유지된다.
        queryClient.clear();

        // 홈페이지로 리다이렉트
        router.push('/');
        router.refresh();
      } else {
        toast.error('계정 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      toast.error('계정 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {/* 파괴적 액션은 화면에서 작게 — 강조는 확인 다이얼로그가 담당한다 */}
        <Button
          variant='outline'
          size='sm'
          className='shrink-0 text-destructive'
        >
          계정 삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='max-h-[90dvh] overflow-y-auto break-keep'>
        {/*
          모바일에서도 왼쪽 정렬 — 공용 헤더는 짧은 확인용이라 모바일 가운데 정렬이 기본인데,
          이 다이얼로그는 목록·입력창이 있는 긴 글이라 가운데로 두면 읽기 어렵다.
        */}
        <AlertDialogHeader className='text-left'>
          <AlertDialogTitle>정말로 계정을 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className='flex items-center gap-1.5 font-medium text-destructive'>
            <AlertTriangle className='size-4 shrink-0' aria-hidden />이 작업은
            되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-4 text-sm'>
          <div className='rounded-lg bg-muted/50 p-4'>
            <p className='mb-2 font-medium'>
              계정을 삭제하면 다음 데이터가 영구적으로 삭제됩니다.
            </p>
            <ul className='list-disc space-y-1 pl-5 text-muted-foreground'>
              <li>모든 독서 기록</li>
              <li>내가 올린 피드 및 활동</li>
              <li>AI 취향 분석 결과</li>
              <li>추천 도서 목록</li>
              <li>알림 내역</li>
              <li>팔로우/팔로워 정보</li>
              <li>프로필 정보 및 이미지</li>
            </ul>
          </div>

          <p className='flex gap-1.5 text-muted-foreground'>
            <Info className='mt-0.5 size-4 shrink-0' aria-hidden />
            <span className='text-pretty'>
              다른 사람 글에 작성한 댓글은 &quot;탈퇴한 사용자&quot;로 표시되며
              삭제되지 않습니다.
            </span>
          </p>

          <div className='space-y-2'>
            <Label htmlFor={inputId} className='block leading-normal'>
              계속하려면 아이디{' '}
              <span className='rounded bg-muted px-1.5 py-0.5 font-semibold'>
                {username}
              </span>{' '}
              를 입력하세요.
            </Label>
            {/* 앱 글꼴 그대로 — 고정폭 글꼴은 한글 화면에서 혼자 튄다 */}
            <Input
              id={inputId}
              type='text'
              autoComplete='off'
              autoCapitalize='none'
              spellCheck={false}
              placeholder={username ?? ''}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmInput('')}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={!isConfirmed || isDeleting}
            className='bg-destructive hover:bg-destructive/90 focus:ring-destructive'
          >
            {isDeleting ? '삭제 중...' : '계정 삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

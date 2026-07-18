'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
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
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type DeleteAccountDialogProps = {
  userEmail: string;
};

/**
 * 계정 삭제 다이얼로그 컴포넌트
 *
 * 학습 포인트:
 * - AlertDialog: 위험한 작업에 대한 확인 다이얼로그
 * - 2단계 확인: 버튼 클릭 + 이메일 입력
 * - 안전 장치: 잘못된 입력 시 삭제 불가
 * - 비동기 처리: API 호출 후 로그아웃 및 리다이렉트
 */
export const DeleteAccountDialog = ({
  userEmail,
}: DeleteAccountDialogProps) => {
  const router = useRouter();

  // 입력된 이메일 확인용 상태
  const [emailInput, setEmailInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // 이메일이 일치하는지 확인
  const isEmailMatched = emailInput === userEmail;

  // 계정 삭제 핸들러
  const handleDeleteAccount = async () => {
    if (!isEmailMatched) {
      toast.error('이메일이 일치하지 않습니다.');
      return;
    }

    setIsDeleting(true);

    try {
      // API 호출: DELETE /api/auth/account
      const response = await apiClient.delete('/auth/account');

      if (response.status === 200) {
        toast.success('계정이 삭제되었습니다.');

        // 로그아웃 처리 (Supabase Auth)
        const { createClient } = await import('@/shared/config/supabase/client');
        const supabase = createClient();
        await supabase.auth.signOut();

        // 홈페이지로 리다이렉트
        router.push('/');
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
        <Button variant='outline' size='sm' className='shrink-0 text-destructive'>
          계정 삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말로 계정을 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-4'>
              <p className='flex items-center gap-1.5 font-semibold text-destructive'>
                <AlertTriangle className='h-4 w-4 shrink-0' />이 작업은 되돌릴
                수 없습니다.
              </p>
              <p>계정을 삭제하면 다음 데이터가 영구적으로 삭제됩니다:</p>
              <ul className='list-disc list-inside space-y-1 text-sm'>
                <li>모든 독서 기록</li>
                <li>내가 올린 피드 및 활동</li>
                <li>AI 취향 분석 결과</li>
                <li>추천 도서 목록</li>
                <li>알림 내역</li>
                <li>팔로우/팔로워 정보</li>
                <li>프로필 정보 및 이미지</li>
              </ul>
              <p className='text-sm mt-3 text-muted-foreground'>
                ℹ️ 다른 사람 글에 작성한 댓글은 &quot;탈퇴한 사용자&quot;로
                표시되며 삭제되지 않습니다.
              </p>
              <div className='space-y-2 mt-4'>
                <p className='text-sm font-medium'>
                  계속하려면 이메일 주소를 입력하세요:
                </p>
                <Input
                  type='email'
                  placeholder={userEmail}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className='font-mono'
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setEmailInput('')}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={!isEmailMatched || isDeleting}
            className='bg-destructive hover:bg-destructive/90 focus:ring-destructive'
          >
            {isDeleting ? '삭제 중...' : '계정 삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

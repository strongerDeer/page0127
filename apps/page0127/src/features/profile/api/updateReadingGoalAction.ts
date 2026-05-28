'use server';

import { createClient } from '@/shared/config/supabase/server';

/**
 * useActionState가 관리할 상태 타입
 * - status로 성공/실패를 구분 → 클라이언트에서 toast 분기에 사용
 * - message는 사용자에게 보여줄 문구
 */
export type ReadingGoalActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

/**
 * 연간 독서 목표 업데이트 (Server Action)
 *
 * 학습 포인트:
 * - 'use server': 이 함수 전체가 서버에서만 실행된다 (DB 직접 접근 OK)
 * - useActionState 시그니처: (이전 상태, FormData) => 다음 상태
 * - FormData는 <input name="...">의 값을 자동 수집한다
 * - userId를 클라이언트에서 받지 않고, 서버 인증으로 직접 확인 (보안)
 * - 유효성 검사를 서버에서 수행 → 클라이언트 우회가 불가능한 신뢰 검증
 */
export const updateReadingGoalAction = async (
  _prevState: ReadingGoalActionState,
  formData: FormData
): Promise<ReadingGoalActionState> => {
  // FormData 값은 항상 문자열로 들어온다 → 숫자로 변환
  const year = Number(formData.get('year'));
  const target = Number(formData.get('target'));

  // 유효성 검사 (서버에서 수행 → 신뢰 가능)
  if (!target || target < 1) {
    return { status: 'error', message: '목표는 최소 1권 이상이어야 합니다.' };
  }
  if (target > 1000) {
    return {
      status: 'error',
      message: '목표는 최대 1,000권까지 설정할 수 있습니다.',
    };
  }

  const supabase = await createClient();

  // 클라이언트가 보낸 ID를 믿지 않고, 쿠키 기반으로 현재 로그인 사용자를 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      reading_goal: { year, target },
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('독서 목표 업데이트 실패:', error.message);
    return { status: 'error', message: '독서 목표 설정에 실패했습니다.' };
  }

  return { status: 'success', message: '독서 목표가 설정되었습니다! 🎯' };
};

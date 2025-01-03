'use client';

import ApplyClub from '@components/club';

import { useAlertContext } from '@contexts/AlertContext';
import useUser from '@connect/user/useUser';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useAppliedClub from '@connect/club/useAppliedClub';
import { APPLY_STATUS } from '@connect/club';
import usePollApplyClubStatus from '@connect/club/usePollApplyClubStatus';
import { updateApplyClub } from '@connect/club/club';
import useApplyClubMutation from '@connect/club/useApplyClubMutation';

const STATUS_MESSAGE = {
  [APPLY_STATUS.READY]: '준비하고 있습니다',
  [APPLY_STATUS.PROGRESS]: '확인중이에요! 잠시만 기다려 주세요',
  [APPLY_STATUS.COMPLETE]: '모임 신청이 완료되었습니다!',
};

export default function TemplateApplyClub({ id }: { id: string }) {
  const router = useRouter();
  const user = useUser();
  const [readyToPoll, setReadyToPoll] = useState<boolean>(false);

  const { open } = useAlertContext();
  const { data } = useAppliedClub({
    userId: user?.userId as string,
    clubId: id,
    options: {
      onSuccess: (applied) => {
        // 신청한 이력 없음: 코드 순차적 진행
        if (applied === null) {
          return;
        }
        // 신청완료: 모달
        if (applied.status === APPLY_STATUS.COMPLETE) {
          open({
            title: '이미 신청이 완료된 모임입니다.',
            onButtonClick: () => {
              router.back();
            },
          });
          return;
        }
        // 재심사: 결과가 나오기전 이탈한 사용자
        setReadyToPoll(true);
      },
      onError: () => {},
      suspense: true,
    },
  });

  const { data: status } = usePollApplyClubStatus({
    onSuccess: async () => {
      await updateApplyClub({
        clubId: id,
        userId: user?.userId as string,
        applyClubValues: {
          status: APPLY_STATUS.COMPLETE,
        },
      });
      router.replace('/club/done?success=true');
    },
    onError: async () => {
      await updateApplyClub({
        clubId: id,
        userId: user?.userId as string,
        applyClubValues: {
          status: APPLY_STATUS.REJECT,
        },
      });
      router.replace('/club/done?success=false');
    },
    enabled: readyToPoll,
  });
  const { mutate, isLoading } = useApplyClubMutation({
    onSuccess: () => {
      setReadyToPoll(true);
    },
    onError: () => {
      router.back();
    },
  });

  if (data !== null && data?.status === APPLY_STATUS.COMPLETE) {
    return null;
  }

  if (readyToPoll || isLoading) {
    // TODO: 개선
    return <>{STATUS_MESSAGE[status ?? 'READY']}</>;
  }

  return <ApplyClub onSubmit={mutate} id={id} />;
}

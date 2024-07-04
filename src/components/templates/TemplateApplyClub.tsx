'use client';

import ApplyClub from '@components/club';
import useAppliedClub from '@components/club/hooks/useAppliedClub';
import useApplyClubMutation from '@components/club/hooks/useApplyClubMutation';
import usePollApplyClubStatus from '@components/club/hooks/usePollApplyClubStatus';
import { useAlertContext } from '@contexts/AlertContext';
import useUser from '@hooks/auth/useUser';
import { APPLY_STATUS } from '@models/applyClub';
import { updateApplyClub } from '@remote/applyClub';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TemplateApplyClub({ id }: { id: string }) {
  const router = useRouter();
  const user = useUser();
  const [readyToPoll, setReadyToPoll] = useState<boolean>(false);

  const { open } = useAlertContext();
  const { data } = useAppliedClub({
    userId: user?.uid as string,
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

  usePollApplyClubStatus({
    onSuccess: async () => {
      await updateApplyClub({
        clubId: id,
        userId: user?.uid as string,
        applyClubValues: {
          status: APPLY_STATUS.COMPLETE,
        },
      });
      router.replace('/club/done?success=true');
    },
    onError: async () => {
      await updateApplyClub({
        clubId: id,
        userId: user?.uid as string,
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
    return <>Loading...</>;
  }

  return <ApplyClub onSubmit={mutate} id={id} />;
}

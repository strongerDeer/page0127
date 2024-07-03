'use client';

import ApplyClub from '@components/club';
import useApplyClubMutation from '@components/club/hooks/useApplyClubMutation';
import usePollApplyClubStatus from '@components/club/hooks/usePollApplyClubStatus';
import useUser from '@hooks/auth/useUser';
import { APPLY_STATUS } from '@models/applyClub';
import { updateApplyClub } from '@remote/applyClub';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TemplateApplyClub({ id }: { id: string }) {
  const router = useRouter();
  const user = useUser();
  const [readyToPoll, setReadyToPoll] = useState<boolean>(false);

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

  // TODO: 개선
  if (readyToPoll || isLoading) {
    return <>Loading...</>;
  }

  return <ApplyClub onSubmit={mutate} id={id} />;
}

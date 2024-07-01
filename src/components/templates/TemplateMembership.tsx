'use client';

import Membership from '@components/membership';
import useMembershipMutation from '@components/membership/hooks/useMembershipMutation';
import usePollMembershipStatus from '@components/membership/hooks/usePollMembershipStatus';
import useUser from '@hooks/auth/useUser';
import { APPLY_STATUS } from '@models/membership';
import { updateMembership } from '@remote/membership';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TemplateMembership() {
  const router = useRouter();
  const user = useUser();
  const [readyToPoll, setReadyToPoll] = useState<boolean>(false);

  usePollMembershipStatus({
    onSuccess: async () => {
      await updateMembership({
        userId: user?.uid as string,
        membershipValues: {
          status: APPLY_STATUS.COMPLETE,
        },
      });
      router.replace('/membership/done?success=true');
    },
    onError: async () => {
      await updateMembership({
        userId: user?.uid as string,
        membershipValues: {
          status: APPLY_STATUS.REJECT,
        },
      });
      router.replace('/membership/done?success=false');
    },
    enabled: readyToPoll,
  });
  const { mutate, isLoading } = useMembershipMutation({
    onSuccess: () => {
      setReadyToPoll(true);
    },
    onError: () => {
      window.history.back();
    },
  });

  // TODO: 개선
  if (readyToPoll || isLoading) {
    return <>Loading...</>;
  }

  return <Membership onSubmit={mutate} />;
}

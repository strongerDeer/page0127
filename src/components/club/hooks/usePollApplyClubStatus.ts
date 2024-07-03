import { APPLY_STATUS } from '@models/applyClub';
import { useQuery } from 'react-query';

interface usePollApplyClubStatusProps {
  onSuccess: () => void;
  onError: () => void;
  enabled: boolean;
}

export default function usePollApplyClubStatus({
  onSuccess,
  onError,
  enabled,
}: usePollApplyClubStatusProps) {
  return useQuery(['applyClubStatus'], () => getClubStatus(), {
    enabled,
    refetchInterval: 2_000,
    staleTime: 0,
    onSuccess: (status) => {
      if (status === APPLY_STATUS.COMPLETE) {
        onSuccess();
      }
    },
    onError: () => {
      onError();
    },
  });
}

function getClubStatus() {
  const values = [
    APPLY_STATUS.READY,
    APPLY_STATUS.PROGRESS,
    APPLY_STATUS.COMPLETE,
    APPLY_STATUS.REJECT,
  ];

  const status = values[Math.floor(Math.random() * values.length)];

  if (status === APPLY_STATUS.REJECT) {
    throw new Error('모임 신청에 실패했습니다');
  }
  return status;
}

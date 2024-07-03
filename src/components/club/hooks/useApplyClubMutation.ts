import { useAlertContext } from '@contexts/AlertContext';
import { ApplyClubValues } from '@models/applyClub';
import { applyClub } from '@remote/applyClub';
import { useMutation } from 'react-query';

interface useApplyClubMutationProps {
  onSuccess: () => void;
  onError: () => void;
}

export default function useApplyClubMutation({
  onSuccess,
  onError,
}: useApplyClubMutationProps) {
  const { open } = useAlertContext();

  return useMutation(
    (applyClubValues: ApplyClubValues) => applyClub(applyClubValues),
    {
      onSuccess: () => {
        onSuccess();
      },
      onError: () => {
        open({
          title: '클럽 신청을 하지 못했어요. 나중에 다시 시도해주세요',
          onButtonClick: () => {
            onError();
          },
        });
      },
    },
  );
}

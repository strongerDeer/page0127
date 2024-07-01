import { useAlertContext } from '@contexts/AlertContext';
import { MembershipValues } from '@models/membership';
import { membership } from '@remote/membership';
import { useMutation } from 'react-query';

interface useMembershipMutationProps {
  onSuccess: () => void;
  onError: () => void;
}

export default function useMembershipMutation({
  onSuccess,
  onError,
}: useMembershipMutationProps) {
  const { open } = useAlertContext();
  return useMutation(
    (membershipValues: MembershipValues) => membership(membershipValues),
    {
      onSuccess: () => {
        onSuccess();
      },
      onError: () => {
        open({
          title: '멤버십을 신청하지 못했어요. 나중에 다시 시도해주세요',
          onButtonClick: () => {
            onError();
          },
        });
      },
    },
  );
}

import { useMutation, useQuery, useQueryClient } from 'react-query';

import { useAlertContext } from '@contexts/AlertContext';
import { useRouter } from 'next/navigation';
import { useModalContext } from '@contexts/ModalContext';
import useUser from '@connect/user/useUser';
import getBookLike, { toggleLike } from '@connect/like/likeBook';

export default function useBookLike() {
  const user = useUser();
  const router = useRouter();
  const client = useQueryClient();
  const { open, close } = useModalContext();
  const { open: alertOpen } = useAlertContext();
  const { data } = useQuery(
    ['book-likes'],
    () => getBookLike({ userId: user?.uid as string }),
    {
      enabled: user !== null,
    },
  );

  const { mutate } = useMutation(
    ({ bookId }: { bookId: string }) => {
      if (user === null) {
        throw new Error('로그인 필요');
      }
      return toggleLike(bookId, user.uid);
    },
    {
      onSuccess: () => {
        client.invalidateQueries(['book-likes']);
      },
      onError: (e: Error) => {
        if (e.message === '로그인 필요') {
          open({
            title: '로그인이 필요해요!',
            body: '로그인 페이지로 이동합니다',
            onButtonClick: () => {
              router.push('/signin');
              close();
            },
            closeModal: () => {
              close();
            },
          });
        } else {
          alertOpen({
            title: '알 수 없는 에러가 발생했습니다. 잠시후 다시 시도해주세요',
            onButtonClick: () => {
              close();
            },
          });
        }
      },
    },
  );

  return { data, mutate };
}

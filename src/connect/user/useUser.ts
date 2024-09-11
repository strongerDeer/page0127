import { useRecoilValue } from 'recoil';
import { userAtom, userLoadingAtom } from '@atoms/user';

export default function useUser() {
  const user = useRecoilValue(userAtom);
  return user;
}

export function useUserLoading() {
  const isLoading = useRecoilValue(userLoadingAtom);
  return isLoading;
}

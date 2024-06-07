import { useRecoilValue } from 'recoil';
import { userAtom } from '@atoms/user';

export default function useUser() {
  const user = useRecoilValue(userAtom);
  return user;
}

import { useRecoilValue } from 'recoil';
import { userAtom } from '@atoms/user';

export default function useUser() {
  return useRecoilValue(userAtom);
}

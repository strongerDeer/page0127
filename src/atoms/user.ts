import { User } from '@connect/user';
import { atom } from 'recoil';

export const userAtom = atom<User | null>({
  key: 'auth/User',
  default: null,
});

export const userLoadingAtom = atom<boolean>({
  key: 'auth/Loading',
  default: true,
});

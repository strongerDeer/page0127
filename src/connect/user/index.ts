export type SocialLoginType =
  | 'password' // 이메일/비밀번호 인증
  | 'google.com'
  | 'github.com';

export interface User {
  uid: string;
  userId: string;
  displayName: string | null;
  photoURL: string | null;
  introduce: string | null;
  currentGoal: number;
  bookCount: number;
  followersCount: number;
  followingCount: number;
  email: string;
  createdAt: string;
  provider: SocialLoginType;
}

export interface Profile {
  displayName: string;
  photoURL: string;
  introduce: string;
  [key: string]: string;
}

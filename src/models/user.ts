export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string | null;

  goal?: number;
  intro?: string;

  follower?: string[];
  following?: string[];
  total?: string[];
  provider?: string | null;
  category?: { [key: string]: string[] } | null;
}

export interface Profile {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  goal?: number;
  intro?: string;
  password: string;
  rePassword: string;
}

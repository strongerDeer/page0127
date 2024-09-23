export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string | null;

  goal?: string;
  intro?: string;

  follower?: string[];
  following?: string[];
  total?: string[];
  provider?: string | null;
  category?: { [key: string]: string[] } | null;
}

export interface Profile {
  displayName: string;
  photoURL: string;
  intro: string;
  [key: string]: string;
}

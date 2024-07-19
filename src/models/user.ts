export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  total: string[];
  provider: string | null;
  category: { [key: string]: string[] } | null;
}

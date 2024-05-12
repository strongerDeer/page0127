export interface UserInterface {
  id?: string | null;
  uid?: string | null;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  provider?: string | null;
  category?: Category;
}

export interface Category {
  novel: number;
  computer: number;
  essay: number;
  improvement: number;
  humanity: number;
  other: number;
}

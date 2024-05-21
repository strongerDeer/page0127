export interface UserInterface {
  id?: string | null;
  uid?: string | null;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  provider?: string | null;
  goals?: number;

  total?: string[];
  소설시희곡?: string[];
  컴퓨터모바일?: string[];
  에세이?: string[];
  자기계발?: string[];
  인문학?: string[];
  경제경영?: string[];
  기타?: string[];
}

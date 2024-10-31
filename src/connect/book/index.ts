export interface Book {
  id?: string;
  title: string;
  subTitle: string | null;
  frontCover: string;
  flipCover: string;
  author: string;
  publisher: string;
  pubDate: string;
  description: string;
  categoryName: string;
  category: string;
  page: number;
  price: number;

  readDate: string;
  memo?: string;
  grade?: Grade | string;
  readUser?: string[];
  likeUsers?: string[];
}

export interface Grade {
  '0': string[];
  '1': string[];
  '2': string[];
  '3': string[];
  '4': string[];
  '5': string[];
  '10': string[];
}

export interface MyBook {
  id: string;
  title: string;
  subTitle: string;
  frontCover: string;
  flipCover: string;
  author: string;
  publisher: string;
  pubDate: string;
  description: string;
  categoryName: string;
  category: string;
  page: number | null;
  price: number | null;
  readDate: string;
  memo: string;
  grade: string;
  createdTime: Date;
  lastUpdatedTime: Date;
}

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
  grade10Count: number;
  readUser?: string[];
  readUserCount: number;
  likeUsers?: string[];

  lastUpdatedTime: string;
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

export const SORT_OPTIONS = {
  LIFE: '인생책순',
  POPULAR: '인기순',
  RECENT: '등록순',
  NAME: '이름순',
  PUBLISH: '출시일순',
} as const;

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];

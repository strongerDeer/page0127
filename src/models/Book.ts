export interface Book {
  pubDate: string;
  readUser: string[];
  title: string;
  category: string;
  readUserCount: 1;
  id: string;
  categoryName: string;
  description: string;

  author: string;
  publisher: string;

  createdTime: StampTime;
  lastUpdatedTime: StampTime;

  frontCover: string;
  flipCover: string;

  grade10User: string[];
}

export interface StampTime {
  seconds: number;
  nanoseconds: number;
}

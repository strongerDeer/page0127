export interface Book {
  pubDate: string;
  readUser: string[];
  title: string;
  category: string;
  readUserCount: number;
  id: string;
  categoryName: string;
  description: string;

  author: string;
  publisher: string;

  createdTime: StampTime;
  lastUpdatedTime: StampTime;
  readDate: StampTime;

  frontCover: string;
  flipCover: string;

  grade: number;
  grade10User: string[];
}

export interface StampTime {
  seconds: number;
  nanoseconds: number;
}

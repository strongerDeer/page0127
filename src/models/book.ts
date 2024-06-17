/*
// aladin
{
    "isbn": "K662736333",
  frontCover: string;
  flipCover: string;

    "title": "결국 해내는 사람들의 원칙 (리커버 에디션) - 최신 뇌과학이 밝혀낸 성공의 비밀",
    "author": "앨런 피즈, 바바라 피즈 (지은이), 이재경 (옮긴이)",
    "pubDate": "2020-12-14",
    "description": "망상활성계를 활용해 어떻게 성공에 이를 수 있는지 그 방법을 차근차근 풀어 간다. 가장 먼저 자신의 목표를 명확하게, 그리고 눈으로 볼 수 있게 시각화해 설정하는 것이 중요하다. 그다음 내 목표에 대해 누가 뭐라 하든 밀고 나가는 힘이 있어야 한다.",

    "priceStandard": 18000,
    "categoryName": "국내도서>자기계발>성공>성공학",
    "publisher": "반니",
    "adult": false,
    "subInfo": {
        "subTitle": "최신 뇌과학이 밝혀낸 성공의 비밀",
        "originalTitle": "",
        "itemPage": 328
    }
}
*/
export interface Book {
  id: string | null;
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
  page: number | null;
  price: number | null;
  readDate: string;
  memo: string;
  grade: { [key: number]: string[] };
}

export interface StampTime {
  seconds: number;
  nanoseconds: number;
}

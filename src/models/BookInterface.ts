export interface BookInterface {
  categoryId: number;
  categoryName: string;

  title: string;
  link: string;
  author: string;
  pubDate: Date;
  description: string;
  itemId: number;
  publisher: string;

  priceSales: number;
  priceStandard: number;

  isbn: string;
  isbn13: string;
  mallType: string;
  stockStatus: string;
  mileage: number;
  cover: string;
  fixedPrice: boolean;

  salesPoint: number;
  adult: boolean;
  customerReviewRank: number;
  seriesInfo: SeriesInfo;
}

export interface SeriesInfo {
  seriesId: number;
  seriesLink: string;
  seriesName: string;
}

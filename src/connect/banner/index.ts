export interface I_Banner {
  title: string;
  subTitle: string;
  view: 'all' | 'login' | 'logout';
  color: string;
  backgroundColor: string;

  link: string;
  imgUrl: string;
  endDate: string;
  startDate: string;
}

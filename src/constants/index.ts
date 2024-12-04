export const SITE = {
  title: 'page 0127.',
  description: '나만의 온라인 서재',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://page0127.vercel.app',
  ogImage: '/images/og-image.jpg',
};

export const ROUTES = {
  HOME: '/',
  NOT_FOUND: '/404',

  LOGIN: '/login',
  JOIN: '/join',

  //book
  BOOK: '/book',
  BOOK_SEARCH: '/book/search',
  MY_BOOK: '/my-books',
  FOLLOW: '/follow',

  // my
  BOOK_CREATE: '/book/create',

  EDIT_PROFILE: '/edit-profile',
  EDIT_GOAL: '/edit-goal',

  // admin
  ADMIN: '/admin',
  ADMIN_BANNER: '/admin/banner',
} as const;

export const COLLECTIONS = {
  USER: 'users',
  PROFILE: 'user_profiles',
  COUNTERS: 'counters',
  FOLLOWER: 'follower',
  FOLLOWING: 'following',
  BANNERS: 'banners',
  BOOKS: 'books',
  BOOK_LIKE: 'book_like',
  CLUBS: 'clubs',
  CLUB_APPLY: 'club_apply',
  REVIEW: 'review',
  FAQ: 'faq',
};

export const PRIMARY_RGB = '41, 208, 99';
export const DEFAULT_GOAL = 12;
export const NO_PROFILE = '/images/no-profile.png';

export const STORAGE_DOWNLOAD_URL_STR =
  'https://firebasestorage.googleapis.com';

export const DEFAULT_BG = `${STORAGE_DOWNLOAD_URL_STR}/v0/b/page0127-7180f.appspot.com/o/yfxfbwa1MEWHplpu4Fm1K8gklOS2%2F03b397f8-c394-4665-bbb4-4c302b20592a?alt=media&token=93ddc068-c2ed-46ec-b97f-c6ef3a4819a9`;

import { Option, Term } from '@connect/club';

export const CLUB_APPLY_LIST = [
  {
    id: '01',
    title: '멤버쉽 관련 안내 및 필수 동의',
    link: '#',
    mandatory: true,
  },
  {
    id: '02',
    title: '개인정보 요약 동의서',
    link: '#',
    mandatory: false,
  },
] as Term[];

export const option1 = [
  { label: 'option1-1', value: 1 },
  { label: 'option1-2', value: 2 },
  { label: 'option1-3', value: 3 },
] as Option[];

export const option2 = [
  { label: 'option2-1', value: 1 },
  { label: 'option2-2', value: 2 },
] as Option[];

export const option3 = [
  { label: 'option3-1', value: 1 },
  { label: 'option3-2', value: 2 },
] as Option[];

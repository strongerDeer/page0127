import TemplateEditProfile from '@components/templates/TemplateEditProfile';

import { InputArr } from '@models/sign';

// 입력정보
const inputArr: InputArr[] = [
  { id: 'displayName', type: 'text', label: '닉네임', placeholder: '2자 이상' },
  {
    id: 'password',
    type: 'password',
    label: '비밀번호',
    placeholder: '8자 이상',
  },
  {
    id: 'rePassword',
    type: 'password',
    label: '비밀번호 확인',
    placeholder: '8자 이상',
  },
  { id: 'goal', type: 'number', label: '올해 목표 권수' },
  { id: 'intro', type: 'text', label: '자기소개', placeholder: '최대 100자' },
];

export default function MyEditPage() {
  return <TemplateEditProfile inputArr={inputArr} />;
}

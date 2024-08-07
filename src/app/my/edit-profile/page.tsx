import TemplateEditProfile from '@components/templates/TemplateEditProfile';

import { InputArr } from '@models/sign';

// 입력정보
const inputArr: InputArr[] = [
  { id: 'displayName', type: 'text', label: '닉네임', placeholder: '2자 이상' },
  { id: 'intro', type: 'text', label: '자기소개', placeholder: '최대 100자' },
  { id: 'goal', type: 'number', label: '올해 목표 권수' },
];

export default function MyEditPage() {
  return <TemplateEditProfile inputArr={inputArr} />;
}

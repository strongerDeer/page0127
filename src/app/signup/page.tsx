import TemplateSign from '@components/templates/TemplateSign';

import { InputArr } from '@models/sign';

// 회원가입 입력정보
const inputArr: InputArr[] = [
  {
    id: 'email',
    type: 'email',
    label: '이메일',
    placeholder: 'abc@abc.com',
  },
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
  { id: 'displayName', type: 'text', label: '닉네임', placeholder: '2자 이상' },
];

export default function SignUpPage() {
  return <TemplateSign title="회원가입" inputArr={inputArr} />;
}

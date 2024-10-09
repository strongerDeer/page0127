import TemplateSign from '@components/templates/TemplateSign';
import { InputArr } from '@connect/sign';

// 로그인 입력정보
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
];
// 로그인 페이지
export default function SignInPage() {
  return <TemplateSign title="로그인" inputArr={inputArr} />;
}

import { EditFormValues } from '@models/sign';
import { SignInFormValues } from '@models/sign';
import validator from 'validator';

export default function signInValidate(formValues: SignInFormValues) {
  const { email, password } = formValues;
  let errors: EditFormValues = {};

  if (validator.isEmail(email) === false) {
    errors.email = '이메일을 확인해주세요';
  }
  if (password.length < 8) {
    errors.password = '비밀번호를 8글자 이상 입력해주세요';
  }

  return errors;
}

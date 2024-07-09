import { FormValues } from '@models/sign';
import validator from 'validator';

export default function validate(
  formValues: Partial<FormValues>,
  signUp?: string,
) {
  const { email, password, rePassword, nickname } = formValues;
  let errors: Partial<FormValues> = {};

  if (email && validator.isEmail(email) === false) {
    errors.email = '이메일을 확인해주세요';
  }
  if (password && password.length < 8) {
    errors.password = '비밀번호를 8글자 이상 입력해주세요';
  }

  if (signUp) {
    if (rePassword && rePassword.length < 8) {
      errors.rePassword = '비밀번호를 8글자 이상 입력해주세요';
    } else if (
      password &&
      rePassword &&
      validator.equals(password, rePassword) === false
    ) {
      errors.rePassword = '비밀번호가 일치하지 않습니다.';
    }
    if (nickname && nickname?.length < 2) {
      errors.nickname = '닉네임은 2글자 이상 입력해주세요';
    }
  }

  return errors;
}

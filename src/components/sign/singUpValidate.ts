import { SignUpFormValues } from '@hooks/useSignUpForm';

import validator from 'validator';

export default function signUpValidate(formValues: SignUpFormValues) {
  const { email, password, rePassword, nickname } = formValues;
  let errors: SignUpFormValues = {};

  if (validator.isEmail(email) === false) {
    errors.email = '이메일을 확인해주세요';
  }
  if (password.length < 8) {
    errors.password = '비밀번호를 8글자 이상 입력해주세요';
  }

  if (rePassword.length < 8) {
    errors.rePassword = '비밀번호를 8글자 이상 입력해주세요';
  } else if (validator.equals(password, rePassword) === false) {
    errors.rePassword = '비밀번호가 일치하지 않습니다.';
  }
  if (nickname?.length < 2) {
    errors.nickname = '닉네임은 2글자 이상 입력해주세요';
  }

  return errors;
}

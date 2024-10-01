import { FormErrors, SignUpFormValues } from '@connect/sign';
import validator from 'validator';

export default function signUpValidate(formValues: SignUpFormValues) {
  const { email, password, rePassword, displayName } = formValues;
  let errors: FormErrors = {};

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
  if (displayName?.length < 2) {
    errors.displayName = '닉네임은 2글자 이상 입력해주세요';
  }

  return errors;
}

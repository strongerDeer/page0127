import validator from 'validator';
import { SignUpFormValues } from '@hooks/useSignUpForm';

export default function editProfileValidate(formValues: SignUpFormValues) {
  const { password, rePassword, displayName } = formValues;
  let errors: SignUpFormValues = {};

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

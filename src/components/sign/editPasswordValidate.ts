import { EditPasswordFormValues, FormErrors } from '@connect/sign';
import validator from 'validator';

export default function editPasswordValidate(
  formValues: EditPasswordFormValues,
) {
  const { currentPassword, password, rePassword } = formValues;
  let errors: FormErrors = {};

  if (currentPassword.length < 8) {
    errors.currentPassword = '비밀번호를 8글자 이상 입력해주세요';
  }

  if (password.length < 8) {
    errors.password = '비밀번호를 8글자 이상 입력해주세요';
  }

  if (rePassword.length < 8) {
    errors.rePassword = '비밀번호를 8글자 이상 입력해주세요';
  } else if (validator.equals(password, rePassword) === false) {
    errors.rePassword = '비밀번호가 일치하지 않습니다.';
  }
  return errors;
}

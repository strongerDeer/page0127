import { EditFormValues, FormErrors } from '@connect/sign';

export default function editProfileValidate(formValues: EditFormValues) {
  const { displayName } = formValues;
  let errors: FormErrors = {};

  if (displayName.length < 2) {
    errors.displayName = '닉네임은 2글자 이상 입력해주세요';
  }

  return errors;
}

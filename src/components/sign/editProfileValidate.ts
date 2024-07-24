import { Profile } from '@models/user';

type Validator = Omit<Profile, 'displayName'>;

export default function editProfileValidate(formValues: Validator) {
  const { displayName } = formValues;
  let errors: Validator = {};

  if (displayName.length < 2) {
    errors.displayName = '닉네임은 2글자 이상 입력해주세요';
  }

  return errors;
}

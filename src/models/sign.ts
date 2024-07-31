import { Profile } from '@models/user';

export interface FormValues {
  email: string;
  password: string;
  rePassword: string;
  displayName: string;
  photoURL: string;
  [key: string]: string;
}

export interface InputArr {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
}

export type SignInFormValues = Pick<FormValues, 'email' | 'password'>;
export type SignUpFormValues = Omit<FormValues, 'photoURL'>;
export type EditFormValues = Omit<Profile, 'photoURL'>;
export type EditPasswordFormValues = Pick<
  FormValues,
  'password' | 'rePassword'
> & { currentPassword: string };
export interface FormErrors {
  [key: string]: string;
}

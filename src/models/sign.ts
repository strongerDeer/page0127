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

'use client';

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@firebase/firebaseApp';
import useUser from '@connect/user/useUser';
import { EditPasswordFormValues } from '@connect/sign';

export default function EditPassword() {
  const user = useUser();

  const editPassword = async (formValues: EditPasswordFormValues) => {
    const authUser = auth.currentUser;

    if (authUser && user?.email) {
      await reauthenticateWithCredential(
        authUser,
        EmailAuthProvider.credential(user?.email, formValues.currentPassword),
      ).then(async () => {
        await updatePassword(authUser, formValues.password);
      });
    }
  };

  return { editPassword };
}

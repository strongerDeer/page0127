'use client';

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@firebase/firebaseApp';
import { EditPasswordFormValues } from '@models/sign';
import useUser from '@hooks/auth/useUser';

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

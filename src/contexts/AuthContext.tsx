import { auth } from '@firebase/firebaeApp';
import { UserInterface } from '@models/UserInterface';
import { onAuthStateChanged } from 'firebase/auth';

import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext<{
  user: UserInterface | null;
  setUser: React.Dispatch<React.SetStateAction<UserInterface | null>>;
  isLoading: boolean;
}>({
  user: null,
  setUser: () => {},
  isLoading: true,
});

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const authData = auth;
  const [currentUser, setCurrentUser] = useState<UserInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authData, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user?.photoURL,
          email: user?.email,
          provider: user?.providerData[0].providerId,
        });
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);

      return () => unsubscribe();
    });
  }, [authData]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{ user: currentUser, setUser: setCurrentUser, isLoading: false }}
    >
      {children}
    </AuthContext.Provider>
  );
};

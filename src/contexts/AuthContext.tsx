import { auth, store } from '@firebase/firebaeApp';
import { UserInterface } from '@models/UserInterface';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc } from 'firebase/firestore';

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
    const unsubscribe = onAuthStateChanged(authData, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(store, 'users', user?.uid));

        if (docSnap.exists()) {
          setCurrentUser(docSnap.data());
        } else {
          setCurrentUser(null);
        }
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

import { auth, store } from '@firebase/firebaeApp';
import { Category, UserInterface } from '@models/UserInterface';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';

import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext<{
  user: UserInterface | null;
  setUser: React.Dispatch<React.SetStateAction<UserInterface | null>>;
  isLoading: boolean;
  category: Category | null;
  setCategory: React.Dispatch<React.SetStateAction<Category | null>>;
}>({
  isLoading: true,
  user: null,
  setUser: () => {},
  category: null,
  setCategory: () => {},
});

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const authData = auth;
  const [currentUser, setCurrentUser] = useState<UserInterface | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authData, async (user) => {
      if (user) {
        onSnapshot(doc(store, 'users', user?.uid), (doc) => {
          setCurrentUser({ uid: user?.uid, ...doc.data() });
        });
        onSnapshot(
          doc(store, `users/${user?.uid}/category/category`),
          (doc) => {
            setCategory({ ...(doc.data() as Category) });
          },
        );
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
      value={{
        user: currentUser,
        setUser: setCurrentUser,
        category: category,
        setCategory: setCategory,
        isLoading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

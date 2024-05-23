import { auth, store } from '@firebase/firebaeApp';
import { Book } from '@models/Book';
import { UserInterface } from '@models/UserInterface';
import { onAuthStateChanged } from 'firebase/auth';

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext<{
  user: UserInterface | null;
  setUser: React.Dispatch<React.SetStateAction<UserInterface | null>>;
  isLoading: boolean;
  userBooks: Book[] | null;
}>({
  isLoading: true,
  user: null,
  setUser: () => {},
  userBooks: null,
});

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const authData = auth;
  const [currentUser, setCurrentUser] = useState<UserInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userBooks, setUserBooks] = useState<Book[] | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authData, async (user) => {
      if (user) {
        onSnapshot(doc(store, 'users', user?.uid), (doc) => {
          setCurrentUser({ uid: user?.uid, ...doc.data() });
        });

        const snapshot = await getDocs(
          query(
            collection(store, `users/${user?.uid}/book`),
            // where('readDate', '>=', new Date('2023-01-01')),
            // where('readDate', '<', new Date('2024-01-01')),
            orderBy('readDate', 'asc'),
          ),
        );
        const userBooks = snapshot.docs.map((doc) => ({
          ...(doc.data() as Book),
        }));

        setUserBooks(userBooks);
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);

      return () => unsubscribe();
    });
  }, [authData]);

  // if (isLoading) {
  //   return <div>Loading...</div>;
  // }

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        setUser: setCurrentUser,
        isLoading: false,
        userBooks: userBooks,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

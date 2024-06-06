import { auth } from '@firebase/firebaeApp';
import { onAuthStateChanged } from 'firebase/auth';
import { useState } from 'react';

// 인증처리
export default function AuthGuard({ children }: { children: React.ReactDOM }) {
  const [initialize, setInitialize] = useState<boolean>(false);
  onAuthStateChanged(auth, (user) => {
    setInitialize(true);
  });

  if (initialize === false) {
    // 로딩 추가
    return <div>인증 처리 로딩중....</div>;
  }
  return <>{children}</>;
}

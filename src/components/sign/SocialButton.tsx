'use client';
// next.js
import { useRouter } from 'next/navigation';

// firebase
import { auth, store } from '@firebase/firebaeApp';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// lib
import { toast } from 'react-toastify';
import Button from '@components/shared/Button';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import { buttonStyle, variant_color } from './SocialButton.css';

export default function SocialButton({
  type,
  signup,
  color,
}: {
  type: string;
  color?: string;
  signup?: boolean;
}) {
  const router = useRouter();

  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    let provider;

    switch (type) {
      case 'google':
        provider = new GoogleAuthProvider();
        break;
      case 'github':
        provider = new GithubAuthProvider();
    }

    await signInWithPopup(
      auth,
      provider as GoogleAuthProvider | GithubAuthProvider,
    )
      .then(async (res) => {
        const userData = await getDoc(doc(store, 'users', res.user.uid));
        if (!userData.exists()) {
          // 유저 정보 저장
          await setDoc(doc(store, 'users', res.user.uid), {
            email: res.user.email,
            displayName: res.user.displayName,
            photoURL: res.user.photoURL,
            provider: res.user.providerData[0].providerId,
          });
        }
        router.push('/');
        toast.success('로그인 되었습니다.');
      })
      .catch((err) => {
        console.log(err);
        const errorMsg = err?.message;
        toast.error(errorMsg);
      });
  };

  return (
    <Button
      full
      size="lg"
      variant="outline"
      onClick={onClick}
      style={assignInlineVars({
        [variant_color]: `var(--${color})`,
      })}
      className={buttonStyle({ variant: 'outline' })}
    >
      {type} {signup ? '회원가입' : '로그인'}
    </Button>
  );
}

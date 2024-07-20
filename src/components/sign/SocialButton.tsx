'use client';

import Button from '@components/shared/Button';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import { buttonStyle, variant_color } from './SocialButton.css';
import useSocialSignIn from './useSocialSignIn';

export default function SocialButton({
  type,
  signUp,
  color,
}: {
  type: string;
  color?: string;
  signUp?: boolean;
}) {
  const { logIn } = useSocialSignIn();

  return (
    <Button
      full
      size="lg"
      variant="outline"
      onClick={() => logIn(type)}
      style={assignInlineVars({
        [variant_color]: `var(--${color})`,
      })}
      className={buttonStyle({ variant: 'outline' })}
    >
      {type} {signUp ? '회원가입' : '로그인'}
    </Button>
  );
}

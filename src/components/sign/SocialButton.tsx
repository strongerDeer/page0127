'use client';

import Button from '@components/shared/Button';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import { buttonStyle, variant_color } from './SocialButton.css';
import useLogin from '@connect/sign/useLogin';
import { SocialLoginType } from '@connect/user';

export default function SocialButton({
  type,
  signUp,
  color,
}: {
  type: SocialLoginType;
  color?: string;
  signUp?: boolean;
}) {
  const { socialLogin } = useLogin();
  return (
    <Button
      full
      size="lg"
      variant="outline"
      onClick={() => socialLogin(type)}
      style={assignInlineVars({
        [variant_color]: `var(--${color})`,
      })}
      className={buttonStyle({ variant: 'outline' })}
    >
      {type.split('.')[0]} {signUp ? '회원가입' : '로그인'}
    </Button>
  );
}

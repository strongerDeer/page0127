import SigninButton from '@components/SigninButton';

export default function SocialLogin() {
  return (
    <div>
      <SigninButton type="google" />
      <SigninButton type="github" />
    </div>
  );
}

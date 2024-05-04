import SigninButton from "@components/SigninButton";

// 로그인 페이지
export default async function signinPage() {
  return (
    <>
      <h2>로그인</h2>
      <SigninButton type="google" />
      <SigninButton type="github" />
    </>
  );
}

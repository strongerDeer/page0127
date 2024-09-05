'use client';
import Button from '@components/shared/Button';
import useUser from '@hooks/auth/useUser';

export default function Club() {
  const user = useUser();
  const hasClub = false;

  if (hasClub) {
    return (
      <div>
        <h2 className="tit01">{user?.displayName}님의 모임</h2>
      </div>
    );
  }

  // READY | DONE

  const CLUB_STATUS = 'READY';

  if (CLUB_STATUS === 'READY') {
    return (
      <div>
        <h2>만들고 있는 모임이 있어요!</h2>
        <p>조금만 더 하면 모임이 개설되요!</p>
        <Button href="#">이어 만들기</Button>
      </div>
    );
  } else {
    return (
      <div>
        <h2>아직 모임이 없으시네요?</h2>
        <p>더 많은 리더들과 함께해요!</p>
        <Button href="#">모임 가입하기</Button>
        <Button href="#">모임 개설하기</Button>
      </div>
    );
  }

  return null;
}

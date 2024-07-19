import { User } from '@models/user';

import CopyButton from './CopyButton';
import KakaoShareButton from './KakaoShareButton';

export default function ActionButtons({ userData }: { userData: User }) {
  return (
    <>
      <div>
        <button type="button" onClick={() => {}}>
          팔로우하기
        </button>

        <KakaoShareButton userData={userData} />

        <CopyButton
          buttonLabel="링크 복사"
          copy={window.window.location.href}
        />
      </div>
    </>
  );
}

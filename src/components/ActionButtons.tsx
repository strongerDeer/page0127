import LoadKakao from '@hooks/useLoadKakao';
import useShare from '@hooks/useShare';
import { User } from '@models/user';
import Image from 'next/image';
import CopyButton from './CopyButton';

export default function ActionButtons({ userData }: { userData: User }) {
  LoadKakao();
  const share = useShare();
  return (
    <div>
      <Button
        label="팔로우 하기"
        onClick={() => {
          //TODO
        }}
      />
      <Button
        label="카카오톡 공유하기"
        onClick={() => {
          console.log('ddd');
          share({
            title: userData.displayName,
            description: userData.displayName,
            imageUrl: userData.photoURL || '',
            buttonLabel: `${userData.displayName} 책장 구경하기`,
          });
        }}
      />
      <CopyButton text={window.window.location.href} />
      <Button label="링크 공유하기" onClick={() => {}} />
    </div>
  );
}

function Button({
  label,
  iconUrl,
  onClick,
}: {
  label: string;
  iconUrl?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}>
      {/* <Image src={iconUrl} alt="" width={100} height={100} /> */}
      {label}
    </button>
  );
}

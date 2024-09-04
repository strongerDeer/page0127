'use client';
import Input from '@components/form/Input';
import InputFileImg from '@components/form/InputFileImg';
import InputRadio from '@components/form/InputRadio';
import Select from '@components/form/Select';
import Button from '@components/shared/Button';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { I_Banner } from '@models/banner';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function createBanner() {
  const [banner, setBanner] = useState<I_Banner>({
    title: '',
    subTitle: '',
    hasAccount: false,
    backgroundColor: '',
    link: '',
    imgUrl: '',
  });

  console.log(banner);
  const [image, setImage] = useState<string>('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bannerRef = doc(collection(store, COLLECTIONS.BANNERS));

    try {
      await setDoc(bannerRef, banner);
      toast.success('등록됨?');
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  };
  return (
    <div>
      배너 추가
      <form onSubmit={onSubmit}>
        <InputFileImg value={image} setValue={setImage} />

        <Input
          label="제목"
          id="title"
          name="title"
          value={banner.title}
          onChange={(e) =>
            setBanner((prev) => ({ ...prev, title: e.target.value }))
          }
        />
        <Input
          label="내용"
          id="subTitle"
          name="subTitle"
          value={banner.subTitle}
          onChange={(e) =>
            setBanner((prev) => ({ ...prev, subTitle: e.target.value }))
          }
        />
        <Input
          label="배경색"
          id="backgroundColor"
          name="backgroundColor"
          value={banner.backgroundColor}
          onChange={(e) =>
            setBanner((prev) => ({ ...prev, backgroundColor: e.target.value }))
          }
        />
        <label>
          <input
            type="checkbox"
            name="account"
            onChange={(e) => {
              if (e.target.checked) {
                setBanner((prev) => ({ ...prev, hasAccount: true }));
              } else {
                setBanner((prev) => ({ ...prev, hasAccount: false }));
              }
            }}
          />
          로그인 계정만
        </label>
        <Input
          label="url"
          id="link"
          name="link"
          value={banner.link}
          onChange={(e) =>
            setBanner((prev) => ({ ...prev, link: e.target.value }))
          }
        />

        <Button type="submit">배너 등록</Button>
      </form>
    </div>
  );
}

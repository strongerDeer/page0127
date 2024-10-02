'use client';
import Input from '@components/form/Input';
import InputFileImg from '@components/form/InputFileImg';
import InputRadio from '@components/form/InputRadio';
import BannerItem from '@components/home/BannerItem';
import Button from '@components/shared/Button';
import { I_Banner } from '@connect/banner';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';

import { collection, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function CreateBanner() {
  const [banner, setBanner] = useState<I_Banner>({
    title: '',
    subTitle: '',
    backgroundColor: '',
    color: '',
    link: '',
    imgUrl: '',
    view: 'all',
    startDate: '',
    endDate: '',
  });

  const [image, setImage] = useState<string>('');

  const router = useRouter();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bannerRef = doc(collection(store, COLLECTIONS.BANNERS));

    try {
      await setDoc(
        bannerRef,
        {
          ...banner,
          startDate: new Date(banner.startDate),
          endDate: new Date(banner.endDate),
        },
        { merge: true },
      );
      toast.success('배너가 등록되었습니다');
      router.push('/admin/banner');
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  };

  const isSubmit = banner.title !== '' && banner.subTitle !== '';
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
          setValue={setBanner}
        />
        <Input
          label="내용"
          id="subTitle"
          name="subTitle"
          value={banner.subTitle}
          setValue={setBanner}
        />
        <Input
          label="텍스트 컬러"
          id="color"
          name="color"
          value={banner.color}
          setValue={setBanner}
        />
        <Input
          label="배경색"
          id="backgroundColor"
          name="backgroundColor"
          value={banner.backgroundColor}
          setValue={setBanner}
        />
        <InputRadio
          title="노출"
          name="view"
          list={[
            { value: 'login', label: '로그인' },
            { value: 'logout', label: '로그아웃' },
            { value: 'all', label: '모두' },
          ]}
          setValue={setBanner}
        />

        <Input
          label="url"
          id="link"
          name="link"
          value={banner.link}
          setValue={setBanner}
        />
        <Input
          label="시작일"
          id="startDate"
          name="startDate"
          type="datetime-local"
          value={banner.startDate}
          setValue={setBanner}
        />
        <Input
          label="완료일"
          id="endDate"
          name="endDate"
          type="datetime-local"
          value={banner.endDate}
          setValue={setBanner}
        />

        <Button type="submit" disabled={!isSubmit}>
          배너 등록
        </Button>
      </form>
      <BannerItem data={banner} />
    </div>
  );
}

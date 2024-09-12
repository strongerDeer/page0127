'use client';
import Button from '@components/shared/Button';
import useBanner from '@hooks/useBanner';

export default function BannerPage() {
  const { data } = useBanner();

  return (
    <div className="max-width">
      <h2 className="title1">Banners</h2>
      {data && data.length > 0 && (
        <ul>
          {data?.map((banner) => (
            <li key={banner.id}>
              <h3>{banner.title}</h3>
              <p>{banner.subTitle}</p>
              <Button>삭제</Button>
              <Button href={`/admin/banner/edit/${banner.id}`}>
                배너 수정
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button href="/admin/banner/create">배너 생성</Button>
    </div>
  );
}

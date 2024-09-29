import { I_Banner } from '@connect/banner';
import Link from 'next/link';

export default function BannerItem({ data }: { data: I_Banner }) {
  const style = { backgroundColor: data.backgroundColor, color: data.color };
  return (
    <>
      {data.link ? (
        <Link href={data.link} style={style}>
          <Inner data={data} />
        </Link>
      ) : (
        <div style={style}>
          <Inner data={data} />
        </div>
      )}
    </>
  );
}
const Inner = ({ data }: { data: I_Banner }) => {
  return (
    <>
      <h2>{data.title}</h2>
      <p>{data.subTitle}</p>
      <p>
        {data.startDate}-{data.endDate}
      </p>
    </>
  );
};

import dynamic from 'next/dynamic';

const DonePage = dynamic(() => import('@components/templates/DonePage'), {
  loading: () => <>loading...</>,
  ssr: false,
});

export default function Page() {
  return <DonePage />;
}

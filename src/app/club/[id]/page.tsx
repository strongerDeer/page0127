import ClubPage from '@components/templates/ClubPage';

export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  return <ClubPage id={id} />;
}

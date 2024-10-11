import ShelfPage from '@components/templates/ShelfPage';

export default async function page({ params }: { params: { userId: string } }) {
  const userId = params.userId;

  return <ShelfPage userId={userId} />;
}

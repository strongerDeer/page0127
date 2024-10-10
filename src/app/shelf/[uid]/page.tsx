import ShelfPage from '@components/templates/ShelfPage';
export default async function page({ params }: { params: { uid: string } }) {
  const pageUid = params.uid;

  return <ShelfPage pageUid={pageUid} />;
}

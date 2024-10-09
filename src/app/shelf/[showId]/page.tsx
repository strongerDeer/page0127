import ShelfPage from '@components/templates/ShelfPage';
export default async function page({ params }: { params: { showId: string } }) {
  const pageId = params.showId;

  return <ShelfPage pageId={pageId} />;
}

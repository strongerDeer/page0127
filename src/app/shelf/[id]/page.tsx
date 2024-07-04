import MyBooks from '@components/MyBooks';
export default async function page({ params }: { params: { id: string } }) {
  const pageUid = params.id;

  return <MyBooks pageUid={pageUid} />;
}

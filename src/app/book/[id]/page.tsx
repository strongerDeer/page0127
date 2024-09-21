import type { Metadata, ResolvingMetadata } from 'next';
import BookDetailPage from '@components/templates/BookDetailPage';
import { getBook } from '@remote/book';
import { collection, getDocs, query } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';

type Props = {
  params: { id: string };
};

export async function generateStaticParams() {
  let q = query(collection(store, COLLECTIONS.BOOKS));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
  }));
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const id = params.id;
  const product = await getBook(id);
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${product.title} | page 0127.`,
    description: `${product.description}`,
    openGraph: {
      type: 'website',
      title: `${product.title} | page 0127.`,
      description: `${product.description}`,
      locale: 'ko_KR',
      siteName: 'page 0127.',
      images: [`${product.frontCover}`, ...previousImages],
      // url: 'https://',
    },
    twitter: {
      card: 'summary',
      title: `${product.title} | page 0127.`,
      description: `${product.description}`,
      images: [`${product.frontCover}`, ...previousImages],
    },
  };
}
export default function Page({ params }: { params: { id: string } }) {
  return <BookDetailPage bookId={params.id} />;
}

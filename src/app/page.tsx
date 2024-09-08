import HomeTemplate from '@components/templates/HomeTemplate';

import getFireBaseData from '@utils/getFirebaseData';
import { COLLECTIONS } from '@constants';
import { Book } from '@models/book';

export default async function HomePage() {
  const books = await getFireBaseData<Book>(COLLECTIONS.BOOKS);

  return <HomeTemplate books={books} />;
}

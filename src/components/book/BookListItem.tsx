import { Book } from '@models/book';
import Image from 'next/image';
import Link from 'next/link';
import LikeButton from './LikeButton';
import { LikeBook } from '@models/likeBook';

interface bookItemProps extends Book {
  index: number;
}
export default function BookListItem(props: bookItemProps) {
  const { id, frontCover, title, category, index, likeUsers } = props;

  return (
    <>
      <Link href={`/book/${id}`}>
        <article className="flex flex-col gap-8 items-center">
          <div className="w-40 h-40 aspect-[1/2] flex justify-center">
            <Image
              src={frontCover}
              alt=""
              width={200}
              height={400}
              className="max-h-full w-auto border border-slate-200 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]"
              priority={index < 4 ? true : false}
            />
          </div>

          <div className="flex flex-col text-center">
            <h3 className="font-bold">{title}</h3>
            <p>{category}</p>
          </div>
        </article>
      </Link>
      {id && <LikeButton bookId={id} likeUsers={likeUsers} />}
    </>
  );
}

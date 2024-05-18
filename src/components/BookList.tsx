'use client';
import useGetBookList from '@hooks/useGetBookList';
import withSuspense from '@hooks/withSuspense';
import { Book } from '@models/Book';
import Image from 'next/image';
import { Skeleton } from './Skeleton';

function BookList() {
  const { data: books } = useGetBookList();
  return (
    <>
      {books && <>2024년 {books?.length}권</>}
      <ul className="grid grid-cols-4 gap-16">
        {books?.map((item: Book, index) => (
          <li key={index}>
            <article className="flex flex-col gap-8 items-center">
              <div className="w-40 h-40 aspect-[1/2] flex justify-center">
                <Image
                  src={item.frontCover}
                  alt=""
                  width={200}
                  height={400}
                  className="max-h-full w-auto border border-slate-200 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]"
                  priority={index < 4 ? true : false}
                />
              </div>
              <div className="flex flex-col text-center">
                <h3 className="font-bold">{item.title}</h3>
                <p>{item.category}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}

export function BookListSkeleton() {
  return (
    <>
      2024년
      <ul className="grid grid-cols-4 gap-16">
        {[...new Array(5)].map((_, index) => (
          <li key={index}>
            <article className="flex flex-col gap-8 items-center">
              <div className="w-40 h-40 aspect-[1/2] flex justify-center">
                <Skeleton width="8rem" height="10rem" />
              </div>
              <div className="flex flex-col text-center gap-2">
                <Skeleton width="10rem" height="1em" />
                <Skeleton width="10rem" height="1em" />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}

export default withSuspense(BookList, { fallback: <BookListSkeleton /> });

import useMyLikeBook from '@hooks/useMyLikeBook';

export default function LikeBooks({ bookIds }: { bookIds: string[] }) {
  let { data } = useMyLikeBook({ bookIds });

  return <div>{data?.map((book) => <>{book.title}</>)}</div>;
}

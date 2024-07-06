import { Skeleton } from '@components/shared/Skeleton';
import { useInView } from 'react-intersection-observer';
import { useQuery } from 'react-query';

export default function () {
  const { ref, inView } = useInView({
    triggerOnce: true,
  });
  const { data = [], isLoading } = useQuery(
    ['review'],
    () => {
      return new Promise<string[]>((resolve) => {
        setTimeout(() => {
          resolve(['너무좋아요', '꼭 읽어보세요']);
        }, 2_000);
      });
    },
    { enabled: inView },
  );

  return (
    <div ref={ref}>
      {isLoading ? (
        <>
          <Skeleton />
          <Skeleton />
        </>
      ) : (
        <>
          {data.map((review, index) => (
            <p key={index}>{review}</p>
          ))}
        </>
      )}
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';

import { Book } from '@connect/book';

import styles from './BookListItem.module.scss';
import useUser from '@connect/user/useUser';
import LikeButton from './LikeButton';

interface bookItemProps extends Book {
  isLike: boolean;
  index: number;
  myList?: boolean;
}
export default function BookListItem(props: bookItemProps) {
  const user = useUser();
  const {
    id,
    description,
    flipCover,
    frontCover,
    title,
    category,
    index,

    publisher,
    author,
    subTitle,
    readUser,
    isLike,

    memo,
    readDate,
    myList,
  } = props;

  return (
    <>
      <article className={styles.article}>
        <Link href={`/book/${id}`}>
          <div className={styles.perspective}>
            <div className={styles.cover}>
              <div className={styles.bookImg}>
                <div className={styles.flipCover}>
                  <Image
                    src={flipCover}
                    alt=""
                    width={200}
                    height={400}
                    priority={index < 4 ? true : false}
                  />
                </div>
                <Image
                  src={frontCover}
                  alt=""
                  width={200}
                  height={400}
                  priority={index < 4 ? true : false}
                />

                {user && (readDate || readUser?.includes(user.userId)) && (
                  <div className={styles.read}>
                    <span className="a11y-hidden">읽음</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.addCon}>
              <p className={styles.description}>
                {myList ? memo : description}
              </p>
              {!myList && (
                <>
                  {publisher && <p className={styles.publisher}>{publisher}</p>}
                  {category && <p className={styles.category}>{category}</p>}
                </>
              )}
            </div>
          </div>
        </Link>

        <div className={styles.content}>
          <h3 className={styles.title}>
            <Link href={`/book/${id}`}>
              {title}

              {subTitle && <span>{subTitle}</span>}
            </Link>
          </h3>
          <p className={styles.author}>{author}</p>
        </div>

        {id && <LikeButton bookId={id} isLike={isLike} />}
      </article>
    </>
  );
}

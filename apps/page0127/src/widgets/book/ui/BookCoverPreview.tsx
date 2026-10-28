'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import Link from 'next/link';

import { Popover, PopoverAnchor, PopoverContent } from '@repo/ui';

import styles from './BookListItem.module.css';

type BookCoverPreviewProps = {
  id: string;
  title: string;
  description: string | null;
  publisher: string | null;
  category: string | null;
  enabled: boolean;
  children: ReactNode;
};

/** 표지 링크는 그대로 이동하고, 마우스·키보드에는 비교용 미리보기를 제공한다. */
export const BookCoverPreview = ({
  id,
  title,
  description,
  publisher,
  category,
  enabled,
  children,
}: BookCoverPreviewProps) => {
  const [open, setOpen] = useState(false);
  const previewId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const closeSoon = () => {
    cancelClose();
    // 표지와 패널 사이의 간격을 건널 수 있게 잠시 유지한다.
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const link = (
    <Link
      prefetch={false}
      href={`/books/info/${id}`}
      aria-label={`${title} 상세 내용 보기`}
      aria-describedby={open ? previewId : undefined}
      className={styles.coverLink}
      data-preview-open={open}
      onPointerEnter={(event) => {
        cancelClose();
        if (enabled && event.pointerType === 'mouse') setOpen(true);
      }}
      onPointerLeave={closeSoon}
      onFocus={(event) => {
        if (enabled && event.currentTarget.matches(':focus-visible')) {
          cancelClose();
          setOpen(true);
        }
      }}
      onBlur={closeSoon}
    >
      {children}
    </Link>
  );

  if (!enabled) return link;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>{link}</PopoverAnchor>
      <PopoverContent
        id={previewId}
        role='tooltip'
        side='right'
        align='start'
        sideOffset={12}
        collisionPadding={16}
        className={styles.preview}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={cancelClose}
        onPointerLeave={closeSoon}
      >
        <p className={styles.previewTitle}>{title}</p>
        <p className={styles.description}>
          {description || '책 소개가 없습니다.'}
        </p>
        {(publisher || category) && (
          <dl className={styles.previewMetadata}>
            {publisher && (
              <div>
                <dt>출판사</dt>
                <dd>{publisher}</dd>
              </div>
            )}
            {category && (
              <div>
                <dt>분류</dt>
                <dd>{category}</dd>
              </div>
            )}
          </dl>
        )}
      </PopoverContent>
    </Popover>
  );
};

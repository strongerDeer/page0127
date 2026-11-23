'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import Image from 'next/image';
import Link from 'next/link';

import {
  isPreOptimizedImageSrc,
  Popover,
  PopoverAnchor,
  PopoverContent,
  toYes24SpineDisplaySrc,
} from '@repo/ui';

import styles from './BookListItem.module.css';

type BookCoverPreviewProps = {
  /** 표지를 눌렀을 때 갈 곳 — bookInfoHref() */
  href: string;
  title: string;
  description: string | null;
  publisher: string | null;
  category: string | null;
  enabled: boolean;
  children: ReactNode;
};

/**
 * 이 표지에 포인터·포커스가 한 번이라도 닿았는지 — 닿기 전엔 책등 이미지를 그리지 않는다.
 *
 * 책등은 평소 rotateY(-90deg) 로 누워 있어 화면에 안 보이는데, 크롬은 그래도 lazy
 * 이미지를 다 받았다. 전체 도서 24권이면 책등 24장 — 2026-11-23 quality 리포트에서
 * 전체 도서 이미지 +586KB·모바일 실제 조건 LCP 6.8→13.2초의 원인이었다.
 * (사파리는 반대로 "화면 밖"으로 보고 hover 해도 안 받아서 eager 로 바꿔 주던 코드가 있었다.)
 *
 * 그래서 이미지 태그 자체를 hover·포커스 때 처음 만든다. 두 브라우저 문제가 같이 풀린다.
 * 터치 기기는 뒤집기가 없으니 대부분 받지 않는다.
 */
const SpineActiveContext = createContext(false);

type BookSpineImageProps = {
  /** DB 에 저장된 책등 주소(보통 YES24 /SIDE/XL) */
  src: string;
};

/** 표지를 뒤집을 때 보이는 책등 사진 — BookCoverPreview 안에서만 쓴다 */
export const BookSpineImage = ({ src }: BookSpineImageProps) => {
  const active = useContext(SpineActiveContext);
  if (!active) return null;

  // 슬롯 높이 최대 190px — 원본 XL(1200px) 대신 L(400px)이면 2배 화면도 충분하다
  const displaySrc = toYes24SpineDisplaySrc(src);
  return (
    <Image
      src={displaySrc}
      alt=''
      width='400'
      height='400'
      data-spine=''
      // 닿은 뒤에야 그려지므로 바로 받는다(뒤집기 애니메이션과 같이 도착하도록)
      loading='eager'
      unoptimized={isPreOptimizedImageSrc(displaySrc)}
    />
  );
};

/**
 * 미리보기 상자를 붙일 기준 사각형.
 *
 * 열리면 표지는 90도 돌아 사라지고 **책등**이 보인다. 책등은 표지 왼쪽 바깥에
 * 서므로, 링크(=표지 너비) 오른쪽에 붙이면 상자가 표지 너비만큼(약 130px) 떨어져
 * 떠 보였다(2026-10-31 HJ). 그래서 보이는 책등의 오른쪽 끝에 붙인다.
 * 책등 오른쪽 끝은 회전 내내 표지 왼쪽 끝 그대로라 애니메이션 중에도 상자가 안 움직인다.
 *
 * 동작 줄이기 설정이면 표지가 돌지 않으니(책등 안 보임) 링크 기준 그대로 둔다.
 */
const getAnchorRect = (link: HTMLElement | null): DOMRect => {
  if (!link) return new DOMRect();
  const spine = link.querySelector<HTMLElement>('[data-spine-face]');
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  return (spine && !reduceMotion ? spine : link).getBoundingClientRect();
};

/** 표지 링크는 그대로 이동하고, 마우스·키보드에는 비교용 미리보기를 제공한다. */
export const BookCoverPreview = ({
  href,
  title,
  description,
  publisher,
  category,
  enabled,
  children,
}: BookCoverPreviewProps) => {
  const [open, setOpen] = useState(false);
  const [spineActive, setSpineActive] = useState(false);
  const previewId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const anchorRef = useRef({
    getBoundingClientRect: () => getAnchorRect(linkRef.current),
  });
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
      ref={linkRef}
      prefetch={false}
      href={href}
      aria-label={`${title} 상세 내용 보기`}
      aria-describedby={open ? previewId : undefined}
      className={styles.coverLink}
      data-preview-open={open}
      onPointerEnter={(event) => {
        setSpineActive(true);
        cancelClose();
        if (enabled && event.pointerType === 'mouse') setOpen(true);
      }}
      onPointerLeave={closeSoon}
      onFocus={(event) => {
        setSpineActive(true);
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

  if (!enabled) {
    return (
      <SpineActiveContext.Provider value={spineActive}>
        {link}
      </SpineActiveContext.Provider>
    );
  }

  return (
    <SpineActiveContext.Provider value={spineActive}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor virtualRef={anchorRef} />
        {link}
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
          {/* 상자 전체를 상세 링크로 — 소개를 읽다가 그대로 눌러 들어갈 수 있게(2026-11-02 HJ).
            키보드는 이미 표지 링크로 같은 곳에 가므로 탭 순서에는 넣지 않는다. */}
          <Link
            prefetch={false}
            href={href}
            tabIndex={-1}
            className={styles.previewLink}
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
          </Link>
        </PopoverContent>
      </Popover>
    </SpineActiveContext.Provider>
  );
};

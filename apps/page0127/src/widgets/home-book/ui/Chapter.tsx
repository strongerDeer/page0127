import { neighborsOf } from '../model/chapters';

import type { BookChapter, ChapterId } from '../model/chapters';

import styles from './Chapter.module.css';

type ChapterProps = {
  id: ChapterId;
  chapters: BookChapter[];
  /** 종이 색 — 시안처럼 쪽마다 흰 종이·회색 종이를 번갈아 둔다 */
  paper?: 'white' | 'sunken' | 'gray';
  /**
   * split  : 왼쪽 글(제N장·제목·설명) · 오른쪽 그림(children) — 시안의 기본 쪽
   * center : 가운데 정렬 한 단(1장 "왜 page0127.인가요")
   * free   : 쪽 틀(머리글·쪽번호)만 두고 children 이 섹션을 직접 그린다(인생책 찾기)
   */
  layout?: 'split' | 'center' | 'free';
  /** 장 라벨 뒤에 붙는 말 — "제2장 · 1분 맛보기" */
  kicker?: string;
  /** 쪽의 큰 제목(h2). 없으면 섹션 이름은 장 이름(aria-label) */
  heading?: React.ReactNode;
  lead?: React.ReactNode;
  /** 설명 아래 — 고른 권수·저장 버튼처럼 글 쪽에 붙는 것 */
  aside?: React.ReactNode;
  children?: React.ReactNode;
};

/**
 * 책의 한 쪽 — 한 화면에 머리글·본문·쪽번호가 다 들어간다 (시안 v9 의 .pg)
 *
 * 서버 컴포넌트. 넘김(겹치기·말림)은 바깥의 HomeBook 이 켠다 — JS 가 없거나 동작 줄이기면
 * 겹치지 않고 쪽이 평범하게 위아래로 이어진다(앵커 이동·버튼은 그대로 동작).
 * - 이전/다음 장은 그냥 앵커 링크다. 마지막 장의 "다음"은 책을 덮는다(#book-back).
 * - 오른쪽 아래 접힌 귀는 뺐다 — 미리 접혀 있던 귀가 넘김 시작에 평평해졌다 다시 말려 어색했다(2026-11-17 HJ).
 * - 장 정보가 없으면(목록에 없는 장) 그리지 않는다.
 */
export const Chapter = ({
  id,
  chapters,
  paper = 'white',
  layout = 'split',
  kicker,
  heading,
  lead,
  aside,
  children,
}: ChapterProps) => {
  const chapter = chapters.find((c) => c.id === id);
  if (!chapter) return null;
  const { prev, next } = neighborsOf(chapters, id);
  const titleId = `${chapter.anchor}-title`;
  const nextHref = next ? `#${next.anchor}` : '#book-back';
  const label = (
    <p className={styles.label}>
      {chapter.label}
      {kicker && ` · ${kicker}`}
    </p>
  );

  return (
    <div
      id={chapter.anchor}
      data-book-page={chapter.id}
      className={`${styles.page} ${styles[paper]}`}
    >
      {/* 머리글 — 실제 책 윗단의 "책 이름 · 장 이름". 섹션이 이미 제목을 읽어 주므로 장식이다 */}
      <p aria-hidden='true' className={styles.runhead}>
        <b>page0127.</b>
        <span>
          {chapter.folio}장 · {chapter.title}
        </span>
      </p>

      <div className={styles.body}>
        {layout === 'free' ? (
          children
        ) : (
          <section
            aria-labelledby={heading ? titleId : undefined}
            aria-label={heading ? undefined : chapter.title}
            className={styles.pw}
          >
            {layout === 'center' ? (
              <div className={styles.center}>
                {label}
                {children}
              </div>
            ) : (
              <div className={styles.split}>
                <div className={styles.copy}>
                  {label}
                  <h2 id={titleId} className={`display-xl ${styles.heading}`}>
                    {heading}
                  </h2>
                  {lead && <p className={styles.lead}>{lead}</p>}
                  {aside}
                </div>
                <div className={styles.vis}>{children}</div>
              </div>
            )}
          </section>
        )}
      </div>

      <nav aria-label={`${chapter.label} 넘기기`} className={styles.folio}>
        {prev ? (
          <a href={`#${prev.anchor}`} className={styles.prev}>
            <span aria-hidden='true'>←</span> 이전 장
          </a>
        ) : (
          <a href='#book-cover' className={styles.prev}>
            <span aria-hidden='true'>←</span> 표지
          </a>
        )}
        <span aria-hidden='true' className={styles.no}>
          {chapter.folio}
        </span>
        <a href={nextHref} className={styles.next}>
          {next ? '다음 장' : '책 덮기'} <span aria-hidden='true'>→</span>
        </a>
      </nav>
    </div>
  );
};

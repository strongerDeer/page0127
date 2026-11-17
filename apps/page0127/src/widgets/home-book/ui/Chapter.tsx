import { neighborsOf } from '../model/chapters';

import type { BookChapter, ChapterId } from '../model/chapters';

import styles from './Chapter.module.css';

type ChapterProps = {
  id: ChapterId;
  chapters: BookChapter[];
  /** 섹션 바탕이 진한 파랑이면 'dark' — 머리글·쪽번호를 흰 글자로 */
  tone?: 'light' | 'dark';
  children: React.ReactNode;
};

/**
 * 책의 한 장 — 홈 섹션 하나를 종이 한 장(.sheet)으로 감싸 머리글·쪽번호·이전/다음 장을 붙인다
 *
 * 서버 컴포넌트. 넘김(쌓기·말림)은 바깥의 HomeBook 이 켠다 — JS 가 없거나 동작 줄이기면
 * 쌓지 않고 평범하게 위아래로 이어진다(머리글·쪽번호·앵커 이동은 그대로 동작).
 * - 이전/다음 장은 그냥 앵커 링크다. 책 모드에서도 앵커 위치가 곧 "그 장을 막 펼친 자리"라
 *   JS 없이 맞는 곳에 멈춘다(HomeBook 주석의 좌표 계산 참고).
 * - 장 정보가 없으면(목록에 없는 장) 감싸지 않고 그대로 그린다.
 */
export const Chapter = ({
  id,
  chapters,
  tone = 'light',
  children,
}: ChapterProps) => {
  const chapter = chapters.find((c) => c.id === id);
  if (!chapter) return <>{children}</>;
  const { prev, next } = neighborsOf(chapters, id);

  return (
    <div
      id={chapter.anchor}
      data-book-chapter={chapter.id}
      data-tone={tone}
      className={styles.chapter}
    >
      <div data-book-sheet='' className={styles.sheet}>
        {/* 머리글 — 실제 책 윗단의 "책 이름 · 장 이름". 섹션이 이미 제목을 읽어 주므로 장식이다 */}
        <p aria-hidden='true' className={styles.runhead}>
          <b>page0127.</b>
          <span>
            {chapter.label} · {chapter.title}
          </span>
        </p>

        {children}

        <nav aria-label={`${chapter.label} 넘기기`} className={styles.folio}>
          {prev ? (
            <a href={`#${prev.anchor}`} className={styles.prev}>
              <span aria-hidden='true'>←</span> 이전 장
            </a>
          ) : (
            <span />
          )}
          <span aria-hidden='true' className={styles.no}>
            {chapter.folio}
          </span>
          {next ? (
            <a href={`#${next.anchor}`} className={styles.next}>
              다음 장 <span aria-hidden='true'>→</span>
            </a>
          ) : (
            <span />
          )}
        </nav>

        {/* 접힌 귀 — 눌러서 넘기는 모서리. 쪽번호의 "다음 장"과 같은 곳이라 키보드·스크린리더에선 뺀다 */}
        {next && (
          <a
            href={`#${next.anchor}`}
            aria-hidden='true'
            tabIndex={-1}
            className={styles.dogEar}
          />
        )}
      </div>
    </div>
  );
};

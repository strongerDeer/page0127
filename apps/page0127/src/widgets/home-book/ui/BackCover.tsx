import styles from './BackCover.module.css';

/**
 * 책의 끝 — 다 읽은 책을 덮어 책상 위에 뒤집어 둔 뒤표지 (② 장 넘김의 마지막, 시안 v9)
 *
 * 서버 컴포넌트. HomeBook 이 마지막 장을 이 책 크기로 줄인 뒤 뒤집어서 이 뒤표지가 보이게 한다.
 * 그래서 장과 같은 표시(data-book-chapter·data-book-sheet)를 달아 쌓기에 함께 들어간다.
 * JS 가 없거나 동작 줄이기면 맺음 다음에 놓인 평범한 한 화면이다.
 *
 * - 뒤표지 글은 장식이라 aria-hidden — 읽을 내용은 앞 장들에 다 있다.
 * - 띠지 명조는 앞표지와 같은 서브셋 글꼴(AboutHero.module.css 의 @font-face, 앞·뒤 문장 글자를 함께 담음).
 * - "처음부터 다시 펼치기"는 맨 위로 가는 앵커 — JS 가 있으면 HomeBook 이 부드럽게 올린다.
 */
export const BackCover = () => (
  <div data-book-chapter='back' className={styles.wrap}>
    <div data-book-sheet='' className={styles.desk}>
      <div className={styles.stage}>
        <div aria-hidden='true' data-book-back='' className={styles.book}>
          <div className={styles.back}>
            <p className={styles.imprint}>
              <b>page0127.</b>
              독서 기록 서비스
              <br />
              읽은 책이 쌓여 책장이 됩니다
            </p>

            {/* 앞표지 띠지가 책등을 돌아 뒤까지 이어진다 */}
            <div className={styles.belt}>
              <div className={styles.beltText}>
                <span className={styles.beltEyebrow}>
                  이 책을 덮은 당신에게
                </span>
                <span className={styles.beltHead}>
                  “오늘 꽂은 한 권이
                  <br />
                  내년의 나를 말해 줍니다”
                </span>
                <span className={styles.beltFoot}>
                  서재는 한 권부터 시작됩니다
                </span>
              </div>
              <div className={styles.isbn}>
                <i />
                ISBN 0127-2026
              </div>
            </div>
          </div>
        </div>

        <a href='#top' data-book-restart='' className={styles.again}>
          처음부터 다시 펼치기 <span aria-hidden='true'>↺</span>
        </a>
      </div>
    </div>
  </div>
);

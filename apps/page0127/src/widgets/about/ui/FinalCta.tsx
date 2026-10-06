import { OAuthLoginButtons } from '@/features/auth/ui/OAuthLoginButtons';

import { Reveal } from './Reveal';
import { SafeCover } from './SafeCover';

import styles from './FinalCta.module.css';

type FinalCtaProps = {
  /** 미리보기 책장에 세울 표지 4장 — 마지막 한 권이 떨어져 꽂힌다 */
  covers: (string | null)[];
};

const BlankCover = () => (
  <span className='block aspect-[2/3] w-20 rounded-sm bg-white/20' />
);

/**
 * 마무리 — 배너 하나가 아니라 바로 누를 수 있는 가입 버튼으로 끝낸다.
 * 버튼은 로그인 페이지와 같은 컴포넌트다(프로바이더 문구·색은 providers 가 관리).
 */
export const FinalCta = ({ covers }: FinalCtaProps) => (
  <section aria-labelledby='final-title' className='px-4 py-28'>
    <Reveal>
      <div className='stage-blue mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-3xl px-6 py-12 text-white shadow-xl md:grid-cols-2 md:px-16 md:py-16'>
        <div>
          <h2 id='final-title' className='display-xl text-balance text-white'>
            오늘 읽은 한 권부터 꽂아 보세요.
          </h2>
          <p className='mt-4 text-base text-white/80'>
            가입하면 서재에서 다음 할 일을 하나씩 알려 드려요.
          </p>
          <div className='mt-8 max-w-sm'>
            {/* /dashboard 는 로그인 뒤 내 서재(/{username})로 보내는 기존 경로 — 코치 팁이 거기서 시작한다 */}
            <OAuthLoginButtons next='/dashboard' />
          </div>
          <p className='mt-5 flex flex-wrap gap-4 text-sm text-white/80'>
            <span>✓ 무료</span>
            <span>✓ 10초 가입</span>
            <span>✓ 언제든 탈퇴</span>
          </p>
        </div>

        {/* 장식 — 가입하면 이렇게 한 권이 꽂힌다는 장면 */}
        <div aria-hidden='true' className='relative hidden h-80 md:block'>
          <div
            className={`absolute right-0 top-2 rounded-2xl bg-card px-4 py-3 text-sm text-text-strong shadow-xl ${styles.toast}`}
          >
            <b>+1 방금 꽂았어요</b>
            <span className='block text-xs text-text-subtle'>
              혜진님의 서재 · 13번째 책
            </span>
          </div>
          <ul className='absolute inset-x-0 bottom-10 flex items-end justify-center gap-2.5 border-b-[10px] border-white/25'>
            {covers.slice(0, 4).map((src, i) => (
              <li key={i} className={i === 3 ? styles.drop : undefined}>
                {src ? (
                  <SafeCover
                    src={src}
                    alt=''
                    width={80}
                    height={120}
                    fallback={<BlankCover />}
                    className='aspect-[2/3] w-20 rounded-sm object-cover shadow-xl'
                  />
                ) : (
                  <BlankCover />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  </section>
);

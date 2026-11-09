import {
  createSentence,
  deleteSentence,
  toggleSentenceActive,
  updateSentence,
} from '../api/sentenceActions';
import { SentenceFields } from './SentenceFields';

import type { AdminSentence } from '../api/getAdminSentences';

type AdminSentenceManagerProps = {
  /** null = 조회 실패 */
  sentences: AdminSentence[] | null;
};

const buttonClass =
  'rounded-md border border-line px-3 py-1.5 text-xs hover:bg-accent';

/**
 * 오늘의 문장 풀 관리 — 서버 컴포넌트 + server action 폼(운영 기록과 같은 방식, JS 없이 동작).
 *
 * 활성 문장이 하나라도 있으면 사용자 서재에 "오늘의 문장" 카드가 나타난다.
 * 뽑힌 적 있는 문장은 지우지 못하고 비활성만 된다(사용자 캘린더 기록 보호).
 */
export const AdminSentenceManager = ({
  sentences,
}: AdminSentenceManagerProps) => {
  const activeCount = sentences?.filter((s) => s.is_active).length ?? 0;

  return (
    <div className='flex flex-col gap-6'>
      <form
        action={createSentence}
        className='flex flex-col gap-3 rounded-lg border border-line p-4'
      >
        <div className='text-sm font-medium'>문장 추가</div>
        <SentenceFields />
        <div>
          <button
            type='submit'
            className='rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground'
          >
            추가
          </button>
        </div>
      </form>

      <div>
        <p className='mb-2 text-xs text-text-subtle'>
          활성 {activeCount}개 · 전체 {sentences?.length ?? 0}개
          {activeCount === 0 &&
            ' — 활성 문장이 없으면 사용자 서재에 카드가 나오지 않아요.'}
        </p>

        {sentences === null ? (
          <p className='text-sm text-text-subtle'>
            목록을 불러오지 못했습니다.
          </p>
        ) : sentences.length === 0 ? (
          <p className='text-sm text-text-subtle'>아직 문장이 없어요.</p>
        ) : (
          <ul className='flex flex-col gap-3'>
            {sentences.map((sentence) => (
              <li
                key={sentence.id}
                className={`rounded-lg border border-line p-4 ${
                  sentence.is_active ? '' : 'opacity-60'
                }`}
              >
                <p className='whitespace-pre-wrap break-keep text-sm font-medium'>
                  {sentence.text}
                </p>
                <p className='mt-1 text-xs text-text-subtle'>
                  《{sentence.book_title}》
                  {sentence.author && ` · ${sentence.author}`}
                  {sentence.translator && ` · ${sentence.translator} 옮김`}
                  {sentence.page && ` · p. ${sentence.page}`}
                  {' · '}
                  {sentence.is_active ? '활성' : '비활성'} · 뽑힘{' '}
                  {sentence.draw_count}회
                </p>
                {sentence.rights_note && (
                  <p className='mt-1 text-xs text-text-subtle'>
                    권리: {sentence.rights_note}
                  </p>
                )}

                <div className='mt-3 flex flex-wrap items-center gap-2'>
                  <form action={toggleSentenceActive}>
                    <input type='hidden' name='id' value={sentence.id} />
                    <input
                      type='hidden'
                      name='next'
                      value={String(!sentence.is_active)}
                    />
                    <button type='submit' className={buttonClass}>
                      {sentence.is_active ? '비활성으로' : '다시 활성으로'}
                    </button>
                  </form>
                  {sentence.draw_count === 0 && (
                    <form action={deleteSentence}>
                      <input type='hidden' name='id' value={sentence.id} />
                      <button type='submit' className={buttonClass}>
                        삭제
                      </button>
                    </form>
                  )}
                </div>

                <details className='mt-3'>
                  <summary className='cursor-pointer text-xs text-text-subtle'>
                    수정
                  </summary>
                  <form
                    action={updateSentence}
                    className='mt-2 flex flex-col gap-3'
                  >
                    <input type='hidden' name='id' value={sentence.id} />
                    <SentenceFields initial={sentence} />
                    <div>
                      <button type='submit' className={buttonClass}>
                        저장
                      </button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

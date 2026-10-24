import { Button } from '@repo/ui';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';

import { toShelfBarHint } from '../model/shelfBarHint';

import type { ReadingPersonalityType } from '@/entities/taste-analysis/model/personalityTypes';

type ShelfBarProps = {
  count: number;
  impression: ReadingPersonalityType | null;
  /** 바를 띄울지 — 책장·저장 버튼이 아직 화면 아래에 있을 때만 */
  visible: boolean;
  /** 책장 쪽으로 데려간다 */
  onJump: () => void;
  onSave: () => void;
};

/**
 * 모바일 하단 고정 바 — 고르기 칸이 화면을 채우면 책장·첫인상·저장 버튼이 모두 그 아래로 밀린다.
 *
 * 학습 포인트:
 * - 자동 스크롤로 데려가지 않는다. 더 고르려던 사람의 화면을 허락 없이 옮기게 된다.
 *   대신 고를 때마다 바뀌는 한 줄을 늘 보이는 자리에 두고, 원하면 눌러서 간다.
 * - 같은 내용이 두 번 보이지 않게, 책장이 화면에 들어오면 숨는다(visible).
 * - 알림 영역(aria-live)이 아니다 — 책장 아래 영역이 이미 첫인상을 읽어 준다. 두 번 읽히면 시끄럽다.
 * - 데스크톱은 한 화면에 다 보여서 바가 없다 — 그 판단은 배치를 아는 ShelfPreview 가 한다.
 */
export const ShelfBar = ({
  count,
  impression,
  visible,
  onJump,
  onSave,
}: ShelfBarProps) => {
  const hint = toShelfBarHint(count, impression?.name ?? null);

  return (
    <div
      // 숨어 있을 땐 포커스·스크린리더에서도 빠진다 — 화면 밖 버튼에 탭이 걸리면 안 된다
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-card/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(4,30,80,0.12)] backdrop-blur transition-transform duration-300 motion-reduce:transition-none ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className='mx-auto flex max-w-xl items-center gap-3'>
        <button
          type='button'
          onClick={onJump}
          className='flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 text-left'
        >
          <BookOpen
            aria-hidden='true'
            className='size-5 shrink-0 text-primary'
          />
          <span className='shrink-0 font-bold text-text-strong'>{count}권</span>
          {hint && (
            <span className='flex min-w-0 items-center gap-1.5 text-sm text-text-body'>
              <span aria-hidden='true' className='text-text-subtle'>
                ·
              </span>
              {impression && (
                <span
                  aria-hidden='true'
                  className='size-2 shrink-0 rounded-full'
                  style={{ backgroundColor: impression.color }}
                />
              )}
              <span className='truncate'>{hint}</span>
            </span>
          )}
          <span className='sr-only'>— 내 책장으로 가기</span>
          <ChevronDown
            aria-hidden='true'
            className='size-4 shrink-0 text-text-subtle'
          />
        </button>
        <Button onClick={onSave} className='shrink-0 gap-1.5 font-bold'>
          <span className='sr-only'>고른 책 </span>저장
          <ArrowRight aria-hidden='true' className='size-4' />
        </Button>
      </div>
    </div>
  );
};

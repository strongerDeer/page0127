'use client';

import { useMemo } from 'react';

import { Button, Popover, PopoverAnchor, PopoverContent } from '@repo/ui';

import { type CoachTipFacts, type CoachTipId } from '../model/coachTips';
import { useCoachTip } from '../model/useCoachTip';

const COACH_TIP_COPY: Record<CoachTipId, { title: string; body: string }> = {
  'add-book': {
    title: '첫 책은 여기서 추가해요',
    body: '읽은 책도, 읽고 있는 책도 좋아요. 한 권이면 서재가 시작됩니다.',
  },
  'set-goal': {
    title: '올해 몇 권 읽어 볼까요?',
    body: '목표를 정하면 올해 탭에서 진행률을 함께 보여 드려요.',
  },
  'taste-analysis': {
    title: '취향 분석을 받을 수 있어요',
    body: '평가한 완독 책이 다섯 권 모였어요. 책장이 말해 주는 취향을 확인해 보세요.',
  },
};

/**
 * 말풍선을 버튼의 어느 쪽에 띄울지.
 *
 * 'add-book' 은 상단 메뉴 오른쪽 끝의 "도서 추가"를 가리킨다. 아래로 띄우면 바로 밑에 있는
 * 서재 카드의 버튼(취향 분석·프로필 편집·공유)을 덮는다 — 책이 0권인 첫 화면에서
 * 하필 가장 먼저 눌러 볼 버튼들이다. 왼쪽에 위쪽을 맞춰 띄우면 상단 메뉴 줄 안에 머문다.
 * (모바일 하단 메뉴처럼 왼쪽 자리가 없으면 Radix 가 알아서 반대쪽으로 뒤집는다.)
 */
const COACH_TIP_PLACEMENT: Record<
  CoachTipId,
  { side: 'bottom' | 'left'; align: 'start' | 'center' }
> = {
  'add-book': { side: 'left', align: 'start' },
  'set-goal': { side: 'bottom', align: 'center' },
  'taste-analysis': { side: 'bottom', align: 'center' },
};

/**
 * 같은 표시가 여러 곳에 있을 수 있다(데스크탑 상단 메뉴 / 모바일 하단 메뉴).
 * 지금 화면에 실제로 보이는 첫 번째를 고른다 — display:none 이면 사각형이 0개다.
 */
const findVisibleTarget = (id: CoachTipId): HTMLElement | null => {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-coach-target="${id}"]`
  );
  return (
    Array.from(candidates).find((el) => el.getClientRects().length > 0) ?? null
  );
};

const hasVisibleTarget = (id: CoachTipId) => findVisibleTarget(id) !== null;

type CoachTipAction = { label: string; onClick: () => void };

type CoachTipHostProps = {
  userId: string;
  facts: CoachTipFacts;
  /**
   * 말풍선 안에서 바로 할 수 있는 일 (선택).
   * 목표 버튼은 연도 탭에만 있어서, 기본 화면(전체 탭)에서는 가리킬 버튼이 없다 —
   * 그래서 목표 팁은 올해 탭을 가리키고 대화상자는 여기서 바로 연다.
   */
  actions?: Partial<Record<CoachTipId, CoachTipAction>>;
};

/**
 * 첫 사용 가이드 말풍선 — 화면에 하나만 두는 "호스트".
 *
 * 말풍선은 여기서만 렌더하고, 가리킬 버튼은 어디에 있든 `coachTarget()` 표시로
 * 찾는다. 팁마다 버튼 옆에 따로 렌더하면 두 개가 동시에 뜨는 것을 막을 곳이 없다.
 *
 * 화면을 막지 않는다: 어두운 덮개 없이 말풍선만 띄우고(비모달), 포커스도
 * 가져가지 않는다. 바깥을 누르면 이번 방문에만 숨고, "알겠어요"면 다시 안 뜬다.
 */
export const CoachTipHost = ({ userId, facts, actions }: CoachTipHostProps) => {
  const { tip, hide, dismiss } = useCoachTip(userId, facts, hasVisibleTarget);

  // tip 은 마운트 뒤에만 정해지므로(서버·하이드레이션 때는 늘 null)
  // 렌더 중에 document 를 읽어도 서버 HTML 과 어긋나지 않는다.
  const anchor = useMemo(() => (tip ? findVisibleTarget(tip) : null), [tip]);
  // Radix 는 위치를 잴 대상을 ref 모양({ current })으로 받는다
  const virtualRef = useMemo(() => ({ current: anchor }), [anchor]);

  // 가리킬 버튼이 이 화면에 없으면 허공에 띄우지 않는다
  if (!tip || !anchor) return null;

  const copy = COACH_TIP_COPY[tip];
  const action = actions?.[tip];

  return (
    <Popover open onOpenChange={(open) => !open && hide()}>
      {/* virtualRef: DOM 을 감싸지 않고 이미 있는 요소의 위치만 빌려 쓴다 */}
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        {...COACH_TIP_PLACEMENT[tip]}
        className='w-64 space-y-3'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className='space-y-1'>
          <p className='text-sm font-semibold text-text-strong'>{copy.title}</p>
          <p className='text-sm text-text-body'>{copy.body}</p>
        </div>
        <div className='flex justify-end gap-2'>
          <Button
            size='sm'
            variant={action ? 'ghost' : 'secondary'}
            onClick={dismiss}
          >
            알겠어요
          </Button>
          {action && (
            <Button
              size='sm'
              onClick={() => {
                hide();
                action.onClick();
              }}
            >
              {action.label}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

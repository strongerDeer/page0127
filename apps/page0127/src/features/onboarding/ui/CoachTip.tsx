'use client';

import { useEffect, useMemo } from 'react';

import { Button, Popover, PopoverAnchor, PopoverContent } from '@repo/ui';

import { type CoachTipFacts, type CoachTipId } from '../model/coachTips';
import { useCoachTip } from '../model/useCoachTip';

const COACH_TIP_COPY: Record<CoachTipId, { title: string; body: string }> = {
  'add-book': {
    title: '첫 책을 추가해 보세요',
    // "여기서"만으로는 어디인지 모른다 — 버튼 이름을 직접 말한다(스크린리더에게도 통한다)
    body: '오른쪽 위 "+ 도서 추가"를 누르면 돼요. 읽은 책도, 읽고 있는 책도 좋아요.',
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
 * 말풍선이 떠 있는 동안 가리키는 버튼에 두르는 테두리.
 * 말풍선이 버튼 옆에 떠 있기만 하면 "이것"이 무엇인지 흐릿하다 — 대상 자체가 달라
 * 보여야 한다. (꼬리 화살표도 붙여 봤지만 연회색 꼬리가 어색해 뺐다, 2026-10-08)
 * 클래스 문자열을 여기 그대로 적어야 Tailwind 가 만든다.
 */
const TARGET_HIGHLIGHT = [
  'ring-2',
  'ring-ring',
  'ring-offset-2',
  'ring-offset-card',
];

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

  // 말풍선이 떠 있는 동안만 대상 버튼에 테두리를 두른다. 이 컴포넌트가 버튼을
  // 렌더하지 않으므로(가리키기만 한다) DOM 에 직접 붙였다가 닫히면 뗀다.
  useEffect(() => {
    if (!anchor) return;
    anchor.classList.add(...TARGET_HIGHLIGHT);
    return () => anchor.classList.remove(...TARGET_HIGHLIGHT);
  }, [anchor]);

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

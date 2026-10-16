import type { ReadingPace } from '@/entities/book';

type PaceMessageInput = {
  pace: ReadingPace;
  completed: number;
  target: number;
  /** 주인에게만 조언(목표 다시 정하기)을 붙인다 — 방문자에게는 사실만 */
  isOwner: boolean;
};

export type PaceMessage = {
  headline: string;
  detail: string | null;
  /** '목표 수정' 버튼을 한마디 옆에서 강조할지 */
  suggestGoalEdit: boolean;
};

/** 문구는 진행형으로(지난해는 과거형) — 판단("늦었다", "기울었다")은 쓰지 않는다 */
export const getPaceMessage = ({
  pace,
  completed,
  target,
  isOwner,
}: PaceMessageInput): PaceMessage => {
  const remaining = Math.max(target - completed, 0);
  const toGoal = `목표 ${target}권까지 ${remaining}권`;

  switch (pace.state) {
    case 'met':
      return {
        headline: '목표 달성! 지금부터는 보너스 책이에요 🎉',
        detail:
          pace.surplus > 0 ? `목표보다 ${pace.surplus}권 더 읽었어요.` : null,
        suggestGoalEdit: false,
      };
    case 'ahead':
      return {
        headline: `목표보다 ${pace.gap}권 앞서 있어요 🏃`,
        detail: `이 속도면 12월엔 ${pace.projected}권까지 갈 수 있어요.`,
        suggestGoalEdit: false,
      };
    case 'on_track':
      return {
        headline: `지금 페이스 그대로면 12월에 딱 ${target}권이에요 👌`,
        detail: isOwner
          ? `${toGoal} — 일주일에 ${pace.perWeek}권씩이면 돼요.`
          : toGoal,
        suggestGoalEdit: false,
      };
    case 'behind':
      return {
        headline: `지금 속도면 올해 약 ${pace.projected}권 📚`,
        detail: isOwner
          ? `${toGoal} — 남은 ${pace.weeksLeft}주 동안 일주일에 ${pace.perWeek}권이면 닿아요.`
          : `${toGoal}, 남은 ${pace.weeksLeft}주`,
        suggestGoalEdit: false,
      };
    case 'far_behind':
      return {
        headline: `지금 속도면 올해 약 ${pace.projected}권 📚`,
        detail: isOwner
          ? `${toGoal} — 남은 기간엔 빠듯한 속도예요. 목표를 다시 정해 볼까요?`
          : `${toGoal}, 남은 ${pace.weeksLeft}주`,
        suggestGoalEdit: isOwner,
      };
    case 'early':
      return {
        headline: `올해 목표 ${target}권, 이제 시작이에요`,
        detail: isOwner ? `일주일에 ${pace.perWeek}권씩이면 닿아요.` : null,
        suggestGoalEdit: false,
      };
    // 지난해는 지난 일로 — 결과 한마디 + 한 달 평균(과거형). 연도는 카드 제목("2024년에 완독한 책")에 있다
    case 'past_met':
      return {
        headline: `목표를 달성했어요! 한 달에 ${pace.perMonth}권씩 읽었어요 🎉`,
        detail:
          pace.surplus > 0
            ? `목표 ${target}권보다 ${pace.surplus}권 더 읽었어요.`
            : `목표 ${target}권을 딱 채웠어요.`,
        suggestGoalEdit: false,
      };
    case 'past_missed':
      return {
        headline: `목표엔 ${remaining}권 모자랐지만, 한 달에 ${pace.perMonth}권씩 읽었어요`,
        detail: `목표 ${target}권 중 ${completed}권을 읽었어요.`,
        suggestGoalEdit: false,
      };
    case 'past_no_goal':
      return {
        headline: `한 달에 ${pace.perMonth}권씩 읽었어요`,
        detail: null,
        suggestGoalEdit: false,
      };
    case 'no_goal':
      return {
        headline: `한 달에 ${pace.perMonth}권씩 읽고 있어요`,
        detail: null,
        suggestGoalEdit: false,
      };
  }
};

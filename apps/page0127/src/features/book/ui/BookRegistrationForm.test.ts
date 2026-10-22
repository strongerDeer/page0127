import { describe, expect, it } from 'vitest';

import { formReducer, type FormState } from './BookRegistrationForm';

const base: FormState = {
  status: 'reading',
  completedDate: '2026-10-22',
  startDate: '',
  showStartDate: false,
  rating: undefined,
  isLifeBook: false,
  oneLineReview: '',
  personalMemo: '',
  tagsInput: '',
  tagError: '',
  isPublic: true,
};

describe('formReducer · TOGGLE_START_DATE', () => {
  it('시작일을 켜면 비어 있던 날짜가 오늘로 채워진다', () => {
    const next = formReducer(base, {
      type: 'TOGGLE_START_DATE',
      checked: true,
      today: '2026-10-22',
    });
    expect(next).toMatchObject({
      showStartDate: true,
      startDate: '2026-10-22',
    });
  });

  it('이미 고른 날짜는 덮어쓰지 않는다', () => {
    const next = formReducer(
      { ...base, startDate: '2026-10-01' },
      { type: 'TOGGLE_START_DATE', checked: true, today: '2026-10-22' }
    );
    expect(next.startDate).toBe('2026-10-01');
  });

  it('끄면 날짜는 그대로 두고 숨기기만 한다', () => {
    const next = formReducer(
      { ...base, showStartDate: true, startDate: '2026-10-01' },
      { type: 'TOGGLE_START_DATE', checked: false, today: '2026-10-22' }
    );
    expect(next).toMatchObject({
      showStartDate: false,
      startDate: '2026-10-01',
    });
  });
});

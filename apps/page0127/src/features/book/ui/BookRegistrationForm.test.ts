import { describe, expect, it } from 'vitest';

import {
  formReducer,
  type FormState,
  toCompletedFields,
  toInitialCompletedPrecision,
} from './BookRegistrationForm';

const base: FormState = {
  status: 'reading',
  completedPrecision: 'date',
  completedDate: '2026-10-22',
  completedYear: '',
  completedYearError: '',
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

describe('완독 시점 (날짜 / 연도만 / 모름)', () => {
  const today = '2026-10-22';

  it('날짜: 비워 두면 오늘, 연도 컬럼은 지운다', () => {
    expect(
      toCompletedFields(
        {
          completedPrecision: 'date',
          completedDate: '',
          completedYear: '2015',
        },
        today
      )
    ).toEqual({ completed_date: today, completed_year: null });
  });

  it('연도만: 날짜 컬럼은 지우고 연도를 숫자로 보낸다', () => {
    expect(
      toCompletedFields(
        {
          completedPrecision: 'year',
          completedDate: '2026-10-01',
          completedYear: '2015',
        },
        today
      )
    ).toEqual({ completed_date: null, completed_year: 2015 });
  });

  it('연도만: 비었거나 미래·너무 옛날 연도면 null (제출을 막는다)', () => {
    for (const completedYear of ['', '2027', '1899', 'abc']) {
      expect(
        toCompletedFields(
          { completedPrecision: 'year', completedDate: '', completedYear },
          today
        )
      ).toBeNull();
    }
  });

  it('모름: 둘 다 null 로 보내 옛 날짜를 지운다', () => {
    expect(
      toCompletedFields(
        {
          completedPrecision: 'unknown',
          completedDate: '2026-10-01',
          completedYear: '2015',
        },
        today
      )
    ).toEqual({ completed_date: null, completed_year: null });
  });

  it('정밀도를 바꿔도 다른 칸의 입력은 남는다', () => {
    const next = formReducer(
      { ...base, completedYear: '2015', completedYearError: '오류' },
      { type: 'SET_COMPLETED_PRECISION', precision: 'date' }
    );
    expect(next).toMatchObject({
      completedPrecision: 'date',
      completedYear: '2015',
      completedYearError: '',
    });
  });

  it('수정 화면의 처음 정밀도', () => {
    expect(
      toInitialCompletedPrecision({
        status: 'completed',
        completed_date: '2024-01-02',
      })
    ).toBe('date');
    expect(
      toInitialCompletedPrecision({ status: 'completed', completed_year: 2015 })
    ).toBe('year');
    expect(toInitialCompletedPrecision({ status: 'completed' })).toBe(
      'unknown'
    );
    // 읽는 중이던 책을 완독으로 바꿀 때는 '모름'이 미리 골라져 있으면 안 된다
    expect(toInitialCompletedPrecision({ status: 'reading' })).toBe('date');
    expect(toInitialCompletedPrecision(undefined)).toBe('date');
  });
});

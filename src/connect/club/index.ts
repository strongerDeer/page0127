import { User } from '@connect/user';

export interface Term {
  id: string;
  title: string;
  link?: string;
  mandatory: boolean;
}

export const APPLY_STATUS = {
  READY: 'READY',
  PROGRESS: 'PROGRESS',
  COMPLETE: 'COMPLETE',
  REJECT: 'REJECT',
} as const;

export interface ApplyClubValues {
  userId: User['uid'];
  terms: Term['id'][];
  appliedAt: Date;
  clubId: string;

  option1: string;
  option2: string;
  option3: string;

  isRadio1: boolean;
  isRadio2: boolean;
  isRadio3: boolean;
  status: keyof typeof APPLY_STATUS;
  step: number;
}

export type InfoValues = Pick<
  ApplyClubValues,
  'option1' | 'option2' | 'option3'
>;

export type CardInfoValues = Pick<
  ApplyClubValues,
  'isRadio1' | 'isRadio2' | 'isRadio3'
>;

export interface Option {
  label: string;
  value: string | number | undefined;
}

export interface Club {
  title: string;
  availableCount: number;
  events?: {
    title: string;
    promotionEndTime?: string;
  };
}

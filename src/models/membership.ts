import { User } from './user';

export interface Term {
  id: string;
  title: string;
  link?: string;
  required?: boolean;
}

export const APPLY_STATUS = {
  READY: 'READY',
  PROGRESS: 'PROGRESS',
  COMPLETE: 'COMPLETE',
  REJECT: 'REJECT',
} as const;

export interface MembershipValues {
  userId: User['uid'];
  terms: Term['id'][];
  appliedAt: Date;
  // cardId: string;

  option1: string;
  option2: string;
  option3: string;

  isRadio1: boolean;
  isRadio2: boolean;
  isRadio3: boolean;
  status: keyof typeof APPLY_STATUS;
}

export interface Option {
  label: string;
  value: string | number | undefined;
}

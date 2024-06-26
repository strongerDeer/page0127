import { User } from './user';

export interface Term {
  id: string;
  title: string;
  link?: string;
  required?: boolean;
}

export interface MembershipValues {
  userId: User['uid'];
  terms: Term['id'][];
  appliedAt: Date;
  cardId: string;

  option1: string;
  option2: string;
  option3: string;
}

export interface Option {
  label: string;
  value: string | number | undefined;
}

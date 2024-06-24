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
}

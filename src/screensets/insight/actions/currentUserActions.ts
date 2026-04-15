/**
 * Current User Actions
 * Switch the active user context (role demo)
 */

import { eventBus } from '@hai3/react';
import { CurrentUserEvents } from '../events/currentUserEvents';
import type { CurrentUser } from '../types';

// Demo users: executive, Backend team lead, one Backend IC
export const MOCK_USERS: CurrentUser[] = [
  { personId: 'p0', name: 'David Park', role: 'executive', teamId: '' },
  { personId: 'p2', name: 'Bob Park',   role: 'team_lead', teamId: 'backend' },
  { personId: 'p1', name: 'Alice Kim',  role: 'ic',        teamId: 'backend' },
];

export const switchUser = (user: CurrentUser): void => {
  eventBus.emit(CurrentUserEvents.UserChanged, user);
};

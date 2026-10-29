export type UserRole = 'host' | 'member';

export interface StudySyncUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
}

export interface StudySession {
  id: string;
  sessionName: string;
  subject: string;
  description?: string;
  start: string;
  end: string;
  createdBy: string;
  createdById?: string;
  createdAt?: string;
  jitsiLink?: string;
  isLaunched?: boolean;
  groupId?: string;
  groupName?: string;
}

export interface MatchSelection {
  groupId: string;
  consideredMemberIds: string[];
  accommodatedMemberIds: string[];
}

export interface SessionDraft {
  sessionName: string;
  subject: string;
  description: string;
  start: string;
  end: string;
  groupId?: string;
  groupName?: string;
  matchSelection?: MatchSelection;
}

export interface MatchHistoryRecord {
  id: string;
  sessionId: string;
  createdById: string;
  createdAt: string;
  consideredMemberIds: string[];
  accommodatedMemberIds: string[];
}

export interface StudyGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdByName: string;
  memberIds: string[];
  createdAt: string;
}

export interface AvailabilityWindow {
  start: string;
  end: string;
}

export interface GroupAvailability {
  userId: string;
  displayName: string;
  timezone: string;
  slotKeys: string[];
  windows: AvailabilityWindow[];
  updatedAt: string;
}

export interface MatchSuggestion {
  start: string;
  end: string;
  attendeeIds: string[];
  attendeeNames: string[];
  attendanceCount: number;
  groupSize: number;
  fairnessScore: number;
  memoryScore: number;
}

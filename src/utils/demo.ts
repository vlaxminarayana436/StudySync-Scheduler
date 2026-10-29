import { addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import type { GroupAvailability, MatchHistoryRecord, StudyGroup, StudySession, UserRole } from '../types';
import { availabilitySlotKey, getNextSevenDays, slotKeysToWindows } from './timeMatching';

function atTime(dayOffset: number, hour: number, minute = 0): Date {
  const day = addDays(startOfDay(new Date()), dayOffset);
  return setMinutes(setHours(day, hour), minute);
}

export function createDemoSessions(role: UserRole, userId: string): StudySession[] {
  const ownHost = role === 'host' ? userId : 'demo-host-alex';

  return [
    {
      id: 'demo-session-1',
      sessionName: 'Calculus II · Integration sprint',
      subject: 'Mathematics',
      description: 'A focused problem-solving session on integration techniques and exam-style questions.',
      start: atTime(1, 10, 30).toISOString(),
      end: atTime(1, 12, 0).toISOString(),
      createdBy: role === 'host' ? 'You' : 'Alex Morgan',
      createdById: ownHost,
      createdAt: new Date().toISOString(),
      jitsiLink: '',
    },
    {
      id: 'demo-session-2',
      sessionName: 'Organic chemistry: carbonyls',
      subject: 'Chemistry',
      description: 'Review reaction mechanisms, then work through a few tricky examples together.',
      start: atTime(2, 16, 0).toISOString(),
      end: atTime(2, 17, 30).toISOString(),
      createdBy: role === 'host' ? 'You' : 'Priya Shah',
      createdById: role === 'host' ? userId : 'demo-host-priya',
      createdAt: new Date().toISOString(),
      jitsiLink: 'https://meet.jit.si/StudySync-chemistry-room',
      isLaunched: true,
    },
    {
      id: 'demo-session-3',
      sessionName: 'Operating systems · Study circle',
      subject: 'Computer science',
      description: 'Compare notes on processes, threads, and scheduling algorithms.',
      start: atTime(4, 18, 0).toISOString(),
      end: atTime(4, 19, 0).toISOString(),
      createdBy: role === 'host' ? 'You' : 'StudySync community',
      createdById: role === 'host' ? userId : 'demo-host-community',
      createdAt: new Date().toISOString(),
      jitsiLink: '',
    },
  ];
}

export function sortSessions(sessions: StudySession[]): StudySession[] {
  return [...sessions].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function demoMatchHistoryStorageKey(userId: string, groupId: string): string {
  return `studysync-demo-match-history-${userId}-${groupId}`;
}

function isMatchHistoryRecord(value: unknown): value is MatchHistoryRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.sessionId === 'string'
    && typeof record.createdById === 'string'
    && typeof record.createdAt === 'string'
    && Array.isArray(record.consideredMemberIds)
    && record.consideredMemberIds.every((memberId) => typeof memberId === 'string')
    && Array.isArray(record.accommodatedMemberIds)
    && record.accommodatedMemberIds.every((memberId) => typeof memberId === 'string');
}

export function readDemoMatchHistory(userId: string, groupId: string): MatchHistoryRecord[] {
  try {
    const saved = localStorage.getItem(demoMatchHistoryStorageKey(userId, groupId));
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isMatchHistoryRecord) : [];
  } catch (error) {
    console.warn('Could not read demo match history', error);
    return [];
  }
}

export function appendDemoMatchHistory(userId: string, groupId: string, record: MatchHistoryRecord): void {
  const history = readDemoMatchHistory(userId, groupId);
  localStorage.setItem(demoMatchHistoryStorageKey(userId, groupId), JSON.stringify([...history, record]));
}

export function createDemoGroupBundle(userId: string, currentUserName: string): { group: StudyGroup; preferences: GroupAvailability[] } {
  const group: StudyGroup = {
    id: 'demo-group-finals',
    name: 'Finals focus crew',
    inviteCode: 'FOCUS24',
    createdBy: userId,
    createdByName: currentUserName,
    memberIds: [userId, 'demo-priya', 'demo-marco', 'demo-sam'],
    createdAt: new Date().toISOString(),
  };

  const days = getNextSevenDays();
  const slot = (dayIndex: number, block: 'morning' | 'afternoon' | 'evening') => availabilitySlotKey(days[dayIndex], block);
  const sampleMembers = [
    { userId, displayName: currentUserName, slots: [slot(1, 'morning'), slot(2, 'afternoon'), slot(4, 'morning'), slot(5, 'evening')] },
    { userId: 'demo-priya', displayName: 'Priya Shah', slots: [slot(1, 'morning'), slot(2, 'afternoon'), slot(3, 'evening'), slot(4, 'morning')] },
    { userId: 'demo-marco', displayName: 'Marco Silva', slots: [slot(1, 'morning'), slot(3, 'evening'), slot(4, 'morning')] },
    { userId: 'demo-sam', displayName: 'Sam Okafor', slots: [slot(2, 'afternoon'), slot(4, 'morning'), slot(5, 'evening')] },
  ];

  const preferences: GroupAvailability[] = sampleMembers.map((member) => ({
    userId: member.userId,
    displayName: member.displayName,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    slotKeys: member.slots,
    windows: slotKeysToWindows(member.slots),
    updatedAt: new Date().toISOString(),
  }));

  return { group, preferences };
}

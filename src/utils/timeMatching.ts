import { addDays, format, startOfDay } from 'date-fns';
import type { AvailabilityWindow, GroupAvailability, MatchHistoryRecord, MatchSuggestion } from '../types';

export const studyTimeBlocks = [
  { id: 'morning', label: 'Morning', range: '9 am – 12 pm', startHour: 9, endHour: 12 },
  { id: 'afternoon', label: 'Afternoon', range: '1 pm – 5 pm', startHour: 13, endHour: 17 },
  { id: 'evening', label: 'Evening', range: '6 pm – 9 pm', startHour: 18, endHour: 21 },
] as const;

export function getNextSevenDays(referenceDate = new Date()): Date[] {
  const today = startOfDay(referenceDate);
  return Array.from({ length: 7 }, (_, index) => addDays(today, index));
}

export function availabilitySlotKey(day: Date, blockId: string): string {
  return `${format(day, 'yyyy-MM-dd')}|${blockId}`;
}

export function slotKeysToWindows(slotKeys: string[]): AvailabilityWindow[] {
  const windows = slotKeys.flatMap((slotKey) => {
    const [dateKey, blockId] = slotKey.split('|');
    const block = studyTimeBlocks.find((item) => item.id === blockId);
    if (!dateKey || !block) return [];

    const start = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(start.getTime())) return [];
    start.setHours(block.startHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(block.endHour, 0, 0, 0);

    return [{ start: start.toISOString(), end: end.toISOString() }];
  });

  return windows;
}

function readValidWindows(preferences: GroupAvailability[]): Map<string, Array<{ start: number; end: number }>> {
  const byUser = new Map<string, Array<{ start: number; end: number }>>();
  preferences.forEach((preference) => {
    const windows = preference.windows.flatMap((window) => {
      const start = new Date(window.start).getTime();
      const end = new Date(window.end).getTime();
      return Number.isFinite(start) && Number.isFinite(end) && end > start ? [{ start, end }] : [];
    });
    byUser.set(preference.userId, windows);
  });
  return byUser;
}

export function computeFairnessDebt(memberIds: string[], history: MatchHistoryRecord[]): Record<string, number> {
  const debt: Record<string, number> = Object.fromEntries([...new Set(memberIds)].map((userId) => [userId, 0]));
  const recent = [...history]
    .filter((record) => Number.isFinite(new Date(record.createdAt).getTime()))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-8);

  recent.forEach((record) => {
    const considered = new Set(record.consideredMemberIds);
    const accommodated = new Set(record.accommodatedMemberIds);
    Object.keys(debt).forEach((userId) => {
      if (!considered.has(userId)) return;
      debt[userId] = accommodated.has(userId) ? Math.max(0, debt[userId] - 1) : debt[userId] + 1;
    });
  });

  return debt;
}

/**
 * Finds shared study windows in 30-minute increments. It first maximizes the
 * number of people who can attend; ties favor members with recent missed matches,
 * then those with fewer alternatives, then the soonest option.
 */
export function findBestMatches(
  memberIds: string[],
  preferences: GroupAvailability[],
  durationMinutes: number,
  referenceDate = new Date(),
  limit = 3,
  fairnessDebt: Record<string, number> = {},
): MatchSuggestion[] {
  const uniqueMemberIds = [...new Set(memberIds)];
  if (uniqueMemberIds.length < 2 || durationMinutes <= 0) return [];

  const windowsByUser = readValidWindows(preferences);
  const userNames = new Map(preferences.map((item) => [item.userId, item.displayName]));
  const stepMs = 30 * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;
  const firstCandidate = Math.ceil(referenceDate.getTime() / stepMs) * stepMs;
  const lastCandidate = referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000;
  const rawCandidates: Array<{ start: number; attendees: string[] }> = [];

  for (let start = firstCandidate; start + durationMs <= lastCandidate; start += stepMs) {
    const attendees = uniqueMemberIds.filter((userId) => (
      windowsByUser.get(userId)?.some((window) => window.start <= start && window.end >= start + durationMs) ?? false
    ));
    if (attendees.length >= Math.floor(uniqueMemberIds.length / 2) + 1) {
      rawCandidates.push({ start, attendees });
    }
  }

  const optionsPerMember = new Map<string, number>();
  uniqueMemberIds.forEach((userId) => optionsPerMember.set(userId, 0));
  rawCandidates.forEach(({ attendees }) => {
    attendees.forEach((userId) => optionsPerMember.set(userId, (optionsPerMember.get(userId) || 0) + 1));
  });

  const ranked = rawCandidates
    .map(({ start, attendees }) => ({
      start,
      attendees,
      memoryScore: attendees.reduce((score, userId) => score + (fairnessDebt[userId] || 0), 0),
      fairnessScore: attendees.reduce((score, userId) => score + (1 / Math.max(1, optionsPerMember.get(userId) || 0)), 0),
    }))
    .sort((a, b) => b.attendees.length - a.attendees.length
      || b.memoryScore - a.memoryScore
      || b.fairnessScore - a.fairnessScore
      || a.start - b.start);

  const selected: MatchSuggestion[] = [];
  const selectedLocalDates = new Set<string>();
  for (const candidate of ranked) {
    const date = new Date(candidate.start);
    const localDate = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (selectedLocalDates.has(localDate)) continue;

    const end = candidate.start + durationMs;
    selectedLocalDates.add(localDate);
    selected.push({
      start: new Date(candidate.start).toISOString(),
      end: new Date(end).toISOString(),
      attendeeIds: candidate.attendees,
      attendeeNames: candidate.attendees.map((userId) => userNames.get(userId) || 'Study buddy'),
      attendanceCount: candidate.attendees.length,
      groupSize: uniqueMemberIds.length,
      fairnessScore: candidate.fairnessScore,
      memoryScore: candidate.memoryScore,
    });
    if (selected.length === limit) break;
  }

  return selected;
}

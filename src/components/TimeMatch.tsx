import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowRight,
  HiOutlineCalendarDays,
  HiOutlineCheck,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineClock,
  HiOutlineLink,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import type { GroupAvailability, MatchHistoryRecord, MatchSuggestion, SessionDraft, StudyGroup, StudySyncUser, UserRole } from '../types';
import { createDemoGroupBundle, readDemoMatchHistory as readStoredDemoMatchHistory } from '../utils/demo';
import { db } from '../utils/firestore';
import { availabilitySlotKey, computeFairnessDebt, findBestMatches, getNextSevenDays, slotKeysToWindows, studyTimeBlocks } from '../utils/timeMatching';

interface TimeMatchProps {
  user: StudySyncUser;
  role: UserRole;
  historyRefreshKey: number;
  onSchedule: (draft: SessionDraft) => void;
}

const durations = [60, 90, 120] as const;
const inviteAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function createInviteCode(): string {
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => inviteAlphabet[value % inviteAlphabet.length]).join('');
}

function displayName(user: StudySyncUser): string {
  return user.displayName?.trim() || user.email?.split('@')[0] || 'StudySync student';
}

function parseGroup(id: string, data: Record<string, unknown>): StudyGroup {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Study group',
    inviteCode: typeof data.inviteCode === 'string' ? data.inviteCode : id,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdByName: typeof data.createdByName === 'string' ? data.createdByName : 'A study buddy',
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.filter((item): item is string => typeof item === 'string') : [],
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
  };
}

function parseAvailability(id: string, data: Record<string, unknown>): GroupAvailability {
  const windows = Array.isArray(data.windows) ? data.windows.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    return typeof candidate.start === 'string' && typeof candidate.end === 'string'
      ? [{ start: candidate.start, end: candidate.end }]
      : [];
  }) : [];

  return {
    userId: typeof data.userId === 'string' ? data.userId : id,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Study buddy',
    timezone: typeof data.timezone === 'string' ? data.timezone : 'UTC',
    slotKeys: Array.isArray(data.slotKeys) ? data.slotKeys.filter((item): item is string => typeof item === 'string') : [],
    windows,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
  };
}

function parseMatchHistory(id: string, data: Record<string, unknown>): MatchHistoryRecord {
  return {
    id,
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : id,
    createdById: typeof data.createdById === 'string' ? data.createdById : '',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    consideredMemberIds: Array.isArray(data.consideredMemberIds) ? data.consideredMemberIds.filter((item): item is string => typeof item === 'string') : [],
    accommodatedMemberIds: Array.isArray(data.accommodatedMemberIds) ? data.accommodatedMemberIds.filter((item): item is string => typeof item === 'string') : [],
  };
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function sameSlots(left: string[], right: string[]): boolean {
  return sortedUnique(left).join(',') === sortedUnique(right).join(',');
}

function demoGroupsStorageKey(userId: string): string {
  return `studysync-demo-groups-${userId}`;
}

function demoAvailabilityStorageKey(userId: string, groupId: string): string {
  return `studysync-demo-availability-${userId}-${groupId}`;
}

function readDemoGroups(user: StudySyncUser): StudyGroup[] {
  const key = demoGroupsStorageKey(user.uid);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as StudyGroup[];
      if (Array.isArray(parsed) && parsed.every((group) => group && group.id && group.inviteCode && Array.isArray(group.memberIds))) return parsed;
    }
  } catch (error) {
    console.warn('Could not read demo study groups', error);
  }

  const bundle = createDemoGroupBundle(user.uid, displayName(user));
  localStorage.setItem(key, JSON.stringify([bundle.group]));
  localStorage.setItem(demoAvailabilityStorageKey(user.uid, bundle.group.id), JSON.stringify(bundle.preferences));
  return [bundle.group];
}

function readDemoAvailability(user: StudySyncUser, group: StudyGroup): GroupAvailability[] {
  const key = demoAvailabilityStorageKey(user.uid, group.id);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as GroupAvailability[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('Could not read demo availability', error);
  }

  if (group.id === 'demo-group-finals') {
    const seeded = createDemoGroupBundle(user.uid, displayName(user)).preferences;
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }

  const emptyPreference: GroupAvailability = {
    userId: user.uid,
    displayName: displayName(user),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    slotKeys: [],
    windows: [],
    updatedAt: '',
  };
  localStorage.setItem(key, JSON.stringify([emptyPreference]));
  return [emptyPreference];
}

function formatSuggestionTime(value: string): { date: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Time to be confirmed', time: '' };
  return { date: format(date, 'EEE, MMM d'), time: format(date, 'h:mm a') };
}

function TimeMatch({ user, role, historyRefreshKey, onSchedule }: TimeMatchProps) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [preferences, setPreferences] = useState<GroupAvailability[]>([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState('');
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(60);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [groupActionBusy, setGroupActionBusy] = useState(false);
  const [groupFormError, setGroupFormError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const selectedSlotsRef = useRef<string[]>([]);
  const lastSharedSlotsRef = useRef<string[]>([]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const ownPreference = preferences.find((preference) => preference.userId === user.uid);
  const savedSlotKeys = ownPreference?.slotKeys || [];
  const isDirty = !sameSlots(selectedSlots, savedSlotKeys);
  const upcomingDays = getNextSevenDays();

  useEffect(() => {
    setGroupsError('');
    setGroupsLoading(true);

    if (user.isDemo) {
      const demoGroups = readDemoGroups(user);
      setGroups(demoGroups);
      setSelectedGroupId((current) => demoGroups.some((group) => group.id === current) ? current : demoGroups[0]?.id || '');
      setGroupsLoading(false);
      return undefined;
    }

    const groupsQuery = query(collection(db, 'studyGroups'), where('memberIds', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const nextGroups = snapshot.docs
          .map((groupDoc) => parseGroup(groupDoc.id, groupDoc.data()))
          .sort((a, b) => a.name.localeCompare(b.name));
        setGroups(nextGroups);
        setSelectedGroupId((current) => nextGroups.some((group) => group.id === current) ? current : nextGroups[0]?.id || '');
        setGroupsLoading(false);
      },
      (error) => {
        console.error('Could not load study groups', error);
        setGroupsError('We couldn’t load your groups. Check your Firebase connection and try again.');
        setGroupsLoading(false);
      },
    );

    return unsubscribe;
  }, [user.isDemo, user.uid]);

  useEffect(() => {
    if (!selectedGroup) {
      selectedSlotsRef.current = [];
      lastSharedSlotsRef.current = [];
      setPreferences([]);
      setSelectedSlots([]);
      setPreferencesLoading(false);
      setPreferencesError('');
      return undefined;
    }

    selectedSlotsRef.current = [];
    lastSharedSlotsRef.current = [];
    setPreferencesError('');
    setPreferencesLoading(true);

    if (user.isDemo) {
      const nextPreferences = readDemoAvailability(user, selectedGroup);
      const ownSlots = nextPreferences.find((item) => item.userId === user.uid)?.slotKeys || [];
      selectedSlotsRef.current = ownSlots;
      lastSharedSlotsRef.current = ownSlots;
      setPreferences(nextPreferences);
      setSelectedSlots(ownSlots);
      setPreferencesLoading(false);
      return undefined;
    }

    const availabilityRef = collection(db, 'studyGroups', selectedGroup.id, 'availability');
    const unsubscribe = onSnapshot(
      availabilityRef,
      (snapshot) => {
        const nextPreferences = snapshot.docs.map((availabilityDoc) => parseAvailability(availabilityDoc.id, availabilityDoc.data()));
        const ownSlots = nextPreferences.find((item) => item.userId === user.uid)?.slotKeys || [];
        const hasUnsavedEdits = !sameSlots(selectedSlotsRef.current, lastSharedSlotsRef.current);
        setPreferences(nextPreferences);
        if (!hasUnsavedEdits) {
          selectedSlotsRef.current = ownSlots;
          lastSharedSlotsRef.current = ownSlots;
          setSelectedSlots(ownSlots);
        }
        setPreferencesLoading(false);
      },
      (error) => {
        console.error('Could not load shared availability', error);
        setPreferencesError('Couldn’t load shared availability. Make sure you’re a member of this group.');
        setPreferencesLoading(false);
      },
    );

    return unsubscribe;
  }, [selectedGroup?.id, user.displayName, user.email, user.isDemo, user.uid]);

  useEffect(() => {
    if (!selectedGroup) {
      setMatchHistory([]);
      setHistoryLoading(false);
      setHistoryError('');
      return undefined;
    }

    setHistoryLoading(true);
    setHistoryError('');
    setMatchHistory([]);
    if (user.isDemo) {
      setMatchHistory(readStoredDemoMatchHistory(user.uid, selectedGroup.id));
      setHistoryLoading(false);
      return undefined;
    }

    const historyQuery = query(
      collection(db, 'studyGroups', selectedGroup.id, 'matchHistory'),
      orderBy('createdAt', 'desc'),
      limit(8),
    );
    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const records = snapshot.docs
          .map((historyDoc) => parseMatchHistory(historyDoc.id, historyDoc.data()))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMatchHistory(records);
        setHistoryLoading(false);
      },
      (error) => {
        console.error('Could not load match history', error);
        setHistoryError('Fairness memory is temporarily unavailable. Current matches still work.');
        setHistoryLoading(false);
      },
    );

    return unsubscribe;
  }, [historyRefreshKey, selectedGroup?.id, user.isDemo, user.uid]);

  const activePreferences = useMemo(() => {
    if (!selectedGroup || preferencesLoading) return preferences;
    const currentPreference: GroupAvailability = {
      userId: user.uid,
      displayName: displayName(user),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      slotKeys: selectedSlots,
      windows: slotKeysToWindows(selectedSlots),
      updatedAt: new Date().toISOString(),
    };
    return preferences.some((preference) => preference.userId === user.uid)
      ? preferences.map((preference) => preference.userId === user.uid ? currentPreference : preference)
      : [...preferences, currentPreference];
  }, [preferences, preferencesLoading, selectedGroup, selectedSlots, user]);

  const fairnessDebt = useMemo(() => selectedGroup ? computeFairnessDebt(selectedGroup.memberIds, matchHistory) : {}, [matchHistory, selectedGroup]);

  const suggestions = useMemo(() => {
    if (!selectedGroup || preferencesLoading || preferencesError || historyLoading) return [];
    return findBestMatches(selectedGroup.memberIds, activePreferences, duration, new Date(), 3, fairnessDebt);
  }, [activePreferences, duration, fairnessDebt, historyLoading, preferencesError, preferencesLoading, selectedGroup]);

  const toggleSlot = (key: string) => {
    setSelectedSlots((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      selectedSlotsRef.current = next;
      return next;
    });
  };

  const handleSaveAvailability = async () => {
    if (!selectedGroup || !isDirty) return;
    setSavingAvailability(true);
    const preference: GroupAvailability = {
      userId: user.uid,
      displayName: displayName(user),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      slotKeys: sortedUnique(selectedSlots),
      windows: slotKeysToWindows(selectedSlots),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (user.isDemo) {
        const nextPreferences = preferences.some((item) => item.userId === user.uid)
          ? preferences.map((item) => item.userId === user.uid ? preference : item)
          : [...preferences, preference];
        localStorage.setItem(demoAvailabilityStorageKey(user.uid, selectedGroup.id), JSON.stringify(nextPreferences));
        setPreferences(nextPreferences);
      } else {
        await setDoc(doc(db, 'studyGroups', selectedGroup.id, 'availability', user.uid), preference);
      }
      selectedSlotsRef.current = preference.slotKeys;
      lastSharedSlotsRef.current = preference.slotKeys;
      toast.success('Your time windows are shared with the group');
    } catch (error) {
      console.error('Could not share availability', error);
      toast.error('Couldn’t save your availability. Please try again.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGroupFormError('');
    const name = newGroupName.trim();
    if (!name) {
      setGroupFormError('Add a name for your study group.');
      return;
    }

    setGroupActionBusy(true);
    try {
      const currentName = displayName(user);
      const createdAt = new Date().toISOString();
      let group: StudyGroup;

      if (user.isDemo) {
        const inviteCode = `D${createInviteCode().slice(0, 7)}`;
        group = { id: `demo-group-${Date.now()}`, name, inviteCode, createdBy: user.uid, createdByName: currentName, memberIds: [user.uid], createdAt };
        const nextGroups = [group, ...groups];
        setGroups(nextGroups);
        localStorage.setItem(demoGroupsStorageKey(user.uid), JSON.stringify(nextGroups));
        const emptyPreference: GroupAvailability = {
          userId: user.uid,
          displayName: currentName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          slotKeys: [],
          windows: [],
          updatedAt: '',
        };
        localStorage.setItem(demoAvailabilityStorageKey(user.uid, group.id), JSON.stringify([emptyPreference]));
      } else {
        let inviteCode = createInviteCode();
        let groupRef = doc(db, 'studyGroups', inviteCode);
        let existing = await getDoc(groupRef);
        for (let attempts = 0; existing.exists() && attempts < 4; attempts += 1) {
          inviteCode = createInviteCode();
          groupRef = doc(db, 'studyGroups', inviteCode);
          existing = await getDoc(groupRef);
        }
        if (existing.exists()) throw new Error('Could not generate a group code. Please try again.');

        group = { id: inviteCode, name, inviteCode, createdBy: user.uid, createdByName: currentName, memberIds: [user.uid], createdAt };
        await setDoc(groupRef, group);
        await setDoc(doc(db, 'studyGroups', group.id, 'availability', user.uid), {
          userId: user.uid,
          displayName: currentName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          slotKeys: [],
          windows: [],
          updatedAt: '',
        });
      }

      setSelectedGroupId(group.id);
      setNewGroupName('');
      setShowCreateGroup(false);
      toast.success(`“${group.name}” is ready. Share the invite code with your study buddies.`);
    } catch (error) {
      console.error('Could not create a study group', error);
      setGroupFormError(error instanceof Error ? error.message : 'Couldn’t create the group. Please try again.');
    } finally {
      setGroupActionBusy(false);
    }
  };

  const handleJoinGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGroupFormError('');
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) {
      setGroupFormError('Enter the invite code your study buddy shared with you.');
      return;
    }

    setGroupActionBusy(true);
    try {
      if (user.isDemo) {
        const group = groups.find((item) => item.inviteCode.toUpperCase() === code);
        if (!group) throw new Error('That demo code isn’t available here. Demo groups only sync in this browser.');
        if (group.memberIds.includes(user.uid)) {
          setSelectedGroupId(group.id);
          setGroupFormError('You’re already part of this study group.');
          return;
        }
        const updatedGroup = { ...group, memberIds: [...group.memberIds, user.uid] };
        const nextGroups = groups.map((item) => item.id === group.id ? updatedGroup : item);
        setGroups(nextGroups);
        localStorage.setItem(demoGroupsStorageKey(user.uid), JSON.stringify(nextGroups));
        const currentPreferences = readDemoAvailability(user, group);
        const ownPreference: GroupAvailability = {
          userId: user.uid,
          displayName: displayName(user),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          slotKeys: [],
          windows: [],
          updatedAt: '',
        };
        localStorage.setItem(demoAvailabilityStorageKey(user.uid, group.id), JSON.stringify([...currentPreferences, ownPreference]));
        setSelectedGroupId(group.id);
      } else {
        const groupRef = doc(db, 'studyGroups', code);
        const groupSnapshot = await getDoc(groupRef);
        if (!groupSnapshot.exists()) throw new Error('We couldn’t find a group with that code. Check it and try again.');
        const group = parseGroup(groupSnapshot.id, groupSnapshot.data());
        if (group.memberIds.includes(user.uid)) {
          setSelectedGroupId(group.id);
          setGroupFormError('You’re already part of this study group.');
          return;
        }
        await updateDoc(groupRef, { memberIds: arrayUnion(user.uid) });
        await setDoc(doc(db, 'studyGroups', group.id, 'availability', user.uid), {
          userId: user.uid,
          displayName: displayName(user),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          slotKeys: [],
          windows: [],
          updatedAt: '',
        });
        setSelectedGroupId(group.id);
      }

      setJoinCode('');
      setShowJoinGroup(false);
      toast.success('You joined the study group');
    } catch (error) {
      console.error('Could not join a study group', error);
      setGroupFormError(error instanceof Error ? error.message : 'Couldn’t join this group. Please try again.');
    } finally {
      setGroupActionBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!selectedGroup) return;
    try {
      await navigator.clipboard.writeText(selectedGroup.inviteCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
      toast.success('Invite code copied');
    } catch (error) {
      console.warn('Clipboard access was unavailable', error);
      toast.error(`Share this invite code: ${selectedGroup.inviteCode}`);
    }
  };

  const scheduleMatch = (suggestion: MatchSuggestion) => {
    if (!selectedGroup) return;
    const now = Date.now();
    const consideredMemberIds = activePreferences
      .filter((preference) => selectedGroup.memberIds.includes(preference.userId)
        && preference.windows.some((window) => new Date(window.end).getTime() > now))
      .map((preference) => preference.userId);
    const considered = new Set(consideredMemberIds);

    onSchedule({
      sessionName: `${selectedGroup.name} study sprint`,
      subject: 'General study',
      description: `A shared ${duration}-minute study block suggested by StudySync Match.`,
      start: suggestion.start,
      end: suggestion.end,
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      matchSelection: {
        groupId: selectedGroup.id,
        consideredMemberIds,
        accommodatedMemberIds: suggestion.attendeeIds.filter((userId) => considered.has(userId)),
      },
    });
  };

  const handleGroupSelection = (groupId: string) => {
    selectedSlotsRef.current = [];
    lastSharedSlotsRef.current = [];
    setSelectedSlots([]);
    setSelectedGroupId(groupId);
    setShowCreateGroup(false);
    setShowJoinGroup(false);
    setGroupFormError('');
  };

  const attendeeNames = selectedGroup
    ? selectedGroup.memberIds.map((memberId) => preferences.find((item) => item.userId === memberId)?.displayName || (memberId === selectedGroup.createdBy ? selectedGroup.createdByName : 'Awaiting availability'))
    : [];

  return (
    <section className="time-match-page">
      <div className="match-intro">
        <div className="match-intro-mark"><HiOutlineSparkles aria-hidden="true" /></div>
        <div>
          <span className="match-eyebrow">STUDYSYNC MATCH · BUILT FOR STUDY GROUPS</span>
          <h2>Stop asking “when works?”</h2>
          <p>Share real open windows, find a time the group can actually make, and turn it into a session in one move.</p>
        </div>
        <div className="match-approach"><span><i /> FAIR-FIRST MATCH</span><small>Maximize attendance.<br />Break ties for the hardest-to-schedule buddy.</small></div>
      </div>

      <div className="match-toolbar">
        <div className="match-group-picker">
          <label htmlFor="study-group-select">YOUR STUDY GROUP</label>
          {groupsLoading ? (
            <span className="match-loading-label">Finding your groups…</span>
          ) : groups.length ? (
            <select id="study-group-select" value={selectedGroupId} onChange={(event) => handleGroupSelection(event.target.value)}>
              {groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
            </select>
          ) : (
            <span className="match-loading-label">Create or join a group to start matching</span>
          )}
        </div>
        <div className="match-toolbar-actions">
          <button className="button button--quiet" type="button" onClick={() => { setShowCreateGroup((value) => !value); setShowJoinGroup(false); setGroupFormError(''); }}><HiOutlinePlus aria-hidden="true" /> Create group</button>
          <button className="button button--primary" type="button" onClick={() => { setShowJoinGroup((value) => !value); setShowCreateGroup(false); setGroupFormError(''); }}><HiOutlineLink aria-hidden="true" /> Join with code</button>
        </div>
      </div>

      {(showCreateGroup || showJoinGroup) && (
        <div className="group-action-card">
          <div className="group-action-heading">
            <span className="group-action-icon"><HiOutlineUserGroup aria-hidden="true" /></span>
            <div><strong>{showCreateGroup ? 'Start a study group' : 'Join your study group'}</strong><small>{showCreateGroup ? 'Pick a name, then share the invite code.' : 'Paste the invite code you got from a group host.'}</small></div>
          </div>
          {showCreateGroup ? (
            <form className="group-action-form" onSubmit={handleCreateGroup}>
              <input type="text" maxLength={48} value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="e.g. Biology finals crew" aria-label="Study group name" />
              <button className="button button--primary" type="submit" disabled={groupActionBusy}>{groupActionBusy ? 'Creating…' : 'Create group'}</button>
            </form>
          ) : (
            <form className="group-action-form" onSubmit={handleJoinGroup}>
              <input type="text" maxLength={12} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="8-character code" aria-label="Study group invite code" />
              <button className="button button--primary" type="submit" disabled={groupActionBusy}>{groupActionBusy ? 'Joining…' : 'Join group'}</button>
            </form>
          )}
          {groupFormError && <p className="group-form-error" role="alert">{groupFormError}</p>}
        </div>
      )}

      {groupsError && <div className="match-error" role="alert">{groupsError}</div>}
      {!groupsLoading && groups.length === 0 && !groupsError && (
        <div className="match-empty-state">
          <span><HiOutlineUserGroup aria-hidden="true" /></span>
          <h3>Good study happens together.</h3>
          <p>Create a group for your class, exam prep crew, or project team—or join one with an invite code. Then StudySync can look for the time that fits.</p>
          <div><button className="button button--primary" type="button" onClick={() => setShowCreateGroup(true)}><HiOutlinePlus aria-hidden="true" /> Create your first group</button><button className="button button--quiet" type="button" onClick={() => setShowJoinGroup(true)}><HiOutlineLink aria-hidden="true" /> Join a group</button></div>
        </div>
      )}

      {selectedGroup && (
        <>
          <div className="selected-group-banner">
            <span className="selected-group-icon"><HiOutlineUserGroup aria-hidden="true" /></span>
            <div className="selected-group-copy"><strong>{selectedGroup.name}</strong><span>{selectedGroup.memberIds.length} member{selectedGroup.memberIds.length === 1 ? '' : 's'} · {selectedGroup.memberIds.length > 1 ? attendeeNames.filter((name) => name !== 'Awaiting availability').join(', ') : 'Invite your study buddies'}</span></div>
            <div className="group-invite-code"><span>INVITE CODE</span><strong>{selectedGroup.inviteCode}</strong><button type="button" onClick={() => void handleCopyCode()} aria-label="Copy invite code">{copiedCode ? <HiOutlineCheck aria-hidden="true" /> : <HiOutlineClipboardDocument aria-hidden="true" />}</button></div>
          </div>

          <div className="match-workspace-grid">
            <section className="content-panel match-availability-panel">
              <header className="panel-heading match-panel-heading">
                <div><span className="panel-overline">STEP 1 · YOUR WINDOWS</span><h2>When can you focus?</h2><p>Choose the blocks you could realistically make this week.</p></div>
                <span className={`availability-save-status ${isDirty ? 'is-dirty' : ''}`}>
                  {savingAvailability ? <span className="mini-spinner" /> : isDirty ? <i /> : <HiOutlineCheckCircle aria-hidden="true" />}
                  {savingAvailability ? 'Sharing…' : isDirty ? 'Not shared yet' : ownPreference?.updatedAt ? 'Shared' : 'Not shared'}
                </span>
              </header>

              {preferencesError && <div className="match-error" role="alert">{preferencesError}</div>}
              <div className="match-grid-scroll">
                <div className="match-availability-grid">
                  <div className="match-grid-corner"><HiOutlineClock aria-hidden="true" /><span>LOCAL TIME</span></div>
                  {upcomingDays.map((day) => <div className="match-day-heading" key={availabilitySlotKey(day, 'morning')}><span>{format(day, 'EEE')}</span><strong>{format(day, 'd')}</strong></div>)}
                  {studyTimeBlocks.map((block) => (
                    <div className="match-window-row" key={block.id}>
                      <div className="match-window-label"><strong>{block.label}</strong><span>{block.range}</span></div>
                      {upcomingDays.map((day) => {
                        const key = availabilitySlotKey(day, block.id);
                        const selected = selectedSlots.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`match-window-toggle ${selected ? 'is-selected' : ''}`}
                            onClick={() => toggleSlot(key)}
                            aria-pressed={selected}
                            aria-label={`${format(day, 'EEEE')} ${block.label}, ${selected ? 'available' : 'not selected'}`}
                            disabled={preferencesLoading || savingAvailability}
                          >
                            {selected ? <HiOutlineCheck aria-hidden="true" /> : <span />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="match-editor-footer">
                <span><HiOutlineSparkles aria-hidden="true" /> Your exact local-time windows are shared only with this group.</span>
                <button className="button button--primary" type="button" onClick={() => void handleSaveAvailability()} disabled={!isDirty || preferencesLoading || savingAvailability}>
                  {savingAvailability ? <span className="button-spinner button-spinner--light" /> : <HiOutlineArrowRight aria-hidden="true" />}
                  {savingAvailability ? 'Sharing…' : 'Share my windows'}
                </button>
              </div>
              {user.isDemo && <p className="match-demo-note">Demo mode uses sample teammates. Demo groups are stored only in this browser.</p>}
            </section>

            <section className="content-panel match-results-panel">
              <header className="panel-heading match-results-heading">
                <div><span className="panel-overline">STEP 2 · THE GROUP OVERLAP</span><h2>Best times together</h2></div>
                <label className="duration-picker"><HiOutlineClock aria-hidden="true" /><select aria-label="Study session length" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{durations.map((minutes) => <option value={minutes} key={minutes}>{minutes} min</option>)}</select></label>
              </header>
              <div className="match-ranking-note"><span className="ranking-sparkle"><HiOutlineSparkles aria-hidden="true" /></span><span><strong>Fairness memory</strong><small>More people first; ties favor members repeatedly missed or with fewer options.</small></span></div>
              <p className="match-memory-footnote">Counts only members who shared windows; being included lowers their miss count. Tracking up to 8 recent sessions.</p>
              {historyError && <div className="match-error" role="status">{historyError}</div>}
              {isDirty && <p className="match-save-reminder" role="status">Share your updated windows before scheduling so the saved match reflects availability the group can see.</p>}

              {preferencesLoading || groupsLoading || historyLoading ? (
                <div className="match-results-loading"><span /><span /><span /></div>
              ) : preferencesError ? (
                <div className="match-results-empty"><HiOutlineCalendarDays aria-hidden="true" /><strong>Waiting for group availability</strong><p>Once availability loads, we’ll find the strongest shared windows.</p></div>
              ) : selectedGroup.memberIds.length < 2 ? (
                <div className="match-results-empty"><HiOutlineUserGroup aria-hidden="true" /><strong>Invite one study buddy</strong><p>We need at least two people in this group to compare open windows.</p></div>
              ) : suggestions.length === 0 ? (
                <div className="match-results-empty"><HiOutlineCalendarDays aria-hidden="true" /><strong>No shared window yet</strong><p>{preferences.filter((item) => item.slotKeys.length > 0).length < selectedGroup.memberIds.length ? 'Ask more group members to share their availability, or try a shorter session.' : 'Try a different session length or choose more open windows.'}</p></div>
              ) : (
                <div className="suggestion-list">
                  {suggestions.map((suggestion, index) => <SuggestionCard key={suggestion.start} suggestion={suggestion} rank={index + 1} role={role} disabled={isDirty || preferencesLoading || savingAvailability} onSchedule={() => scheduleMatch(suggestion)} />)}
                </div>
              )}
              <footer className="match-results-footer"><span>{preferences.filter((item) => item.slotKeys.length > 0).length} of {selectedGroup.memberIds.length} members have shared availability</span><span>Times shown in your local zone · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></footer>
            </section>
          </div>
        </>
      )}

      {!groupsLoading && groups.length > 0 && !selectedGroup && <div className="match-empty-state"><h3>Select or create a study group.</h3><p>Group availability stays private to its members.</p></div>}
    </section>
  );
}

interface SuggestionCardProps {
  suggestion: MatchSuggestion;
  rank: number;
  role: UserRole;
  disabled: boolean;
  onSchedule: () => void;
}

function SuggestionCard({ suggestion, rank, role, disabled, onSchedule }: SuggestionCardProps) {
  const time = formatSuggestionTime(suggestion.start);
  const endTime = formatSuggestionTime(suggestion.end).time;
  const attendanceLabel = suggestion.attendanceCount === suggestion.groupSize ? 'Everyone can make it' : `${suggestion.attendanceCount} of ${suggestion.groupSize} free`;

  return (
    <article className={`suggestion-card ${rank === 1 ? 'is-top-match' : ''}`}>
      <div className="suggestion-rank">{rank === 1 ? <HiOutlineSparkles aria-hidden="true" /> : `0${rank}`}</div>
      <div className="suggestion-main">
        <div className="suggestion-title-row"><span className="suggestion-date">{time.date}</span>{rank === 1 && <span className="best-match-badge">BEST FIT</span>}</div>
        <strong className="suggestion-time">{time.time}{endTime ? ` – ${endTime}` : ''}</strong>
        <span className="suggestion-availability"><HiOutlineCheckCircle aria-hidden="true" /> {attendanceLabel}</span>
        <div className="suggestion-attendees" aria-label={`Available: ${suggestion.attendeeNames.join(', ')}`}>
          {suggestion.attendeeNames.slice(0, 4).map((name, index) => <span key={`${name}-${index}`} title={name}>{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>)}
          <small>{suggestion.attendeeNames.join(', ')}</small>
        </div>
      </div>
      <div className="suggestion-action">
        {role === 'host' ? <button className="button button--schedule-match" type="button" onClick={onSchedule} disabled={disabled}>Schedule <HiOutlineArrowRight aria-hidden="true" /></button> : <span>Ask your host to book this time</span>}
      </div>
    </article>
  );
}

export default TimeMatch;

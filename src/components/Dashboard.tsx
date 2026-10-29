import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  HiOutlineAcademicCap,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineArrowRightEndOnRectangle,
  HiOutlineBell,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineCheck,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineXMark,
} from 'react-icons/hi2';
import SessionForm from './SessionForm';
import CalendarView from './CalendarView';
import TimeMatch from './TimeMatch';
import { db } from '../utils/firestore';
import { appendDemoMatchHistory, createDemoSessions, sortSessions } from '../utils/demo';
import type { MatchHistoryRecord, SessionDraft, StudySession, StudySyncUser, UserRole } from '../types';

type DashboardView = 'overview' | 'calendar' | 'sessions' | 'availability';

interface DashboardProps {
  user: StudySyncUser;
  role: UserRole;
  onLogout: () => void | Promise<void>;
}

const navItems: { id: DashboardView; label: string; icon: typeof HiOutlineSquares2X2 }[] = [
  { id: 'overview', label: 'Overview', icon: HiOutlineSquares2X2 },
  { id: 'calendar', label: 'Calendar', icon: HiOutlineCalendarDays },
  { id: 'sessions', label: 'Study sessions', icon: HiOutlineUserGroup },
  { id: 'availability', label: 'Time match', icon: HiOutlineAdjustmentsHorizontal },
];

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function firestoreDate(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate as () => Date)().toISOString();
  }
  return '';
}

function readStoredSessions(key: string, role: UserRole, userId: string): StudySession[] {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as StudySession[];
      if (Array.isArray(parsed) && parsed.every((session) => session && session.id && session.start && session.end)) {
        return sortSessions(parsed);
      }
    }
  } catch (error) {
    console.warn('Could not read demo sessions from local storage', error);
  }
  const initial = createDemoSessions(role, userId);
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

function getFriendlyGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstName(user: StudySyncUser): string {
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'there';
  return name.split(/\s+/)[0];
}

function initials(user: StudySyncUser): string {
  const name = user.displayName?.trim() || user.email?.trim() || 'S';
  return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function Dashboard({ user, role, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [matchHistoryRevision, setMatchHistoryRevision] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekDate, setWeekDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [sessionFormInitialValues, setSessionFormInitialValues] = useState<Partial<SessionDraft>>();

  const demoStorageKey = `studysync-demo-sessions-${user.uid}`;

  useEffect(() => {
    setSessionError('');
    setSessionsLoading(true);

    if (user.isDemo) {
      setSessions(readStoredSessions(demoStorageKey, role, user.uid));
      setSessionsLoading(false);
      return undefined;
    }

    const sessionsQuery = query(collection(db, 'sessions'));
    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const nextSessions = snapshot.docs.map((sessionDoc) => {
          const data = sessionDoc.data();
          return {
            id: sessionDoc.id,
            sessionName: typeof data.sessionName === 'string' ? data.sessionName : 'Study session',
            subject: typeof data.subject === 'string' ? data.subject : 'Other',
            description: typeof data.description === 'string' ? data.description : '',
            start: firestoreDate(data.start),
            end: firestoreDate(data.end),
            createdBy: typeof data.createdBy === 'string' ? data.createdBy : 'StudySync member',
            createdById: typeof data.createdById === 'string' ? data.createdById : undefined,
            createdAt: firestoreDate(data.createdAt),
            groupId: typeof data.groupId === 'string' ? data.groupId : undefined,
            groupName: typeof data.groupName === 'string' ? data.groupName : undefined,
            jitsiLink: typeof data.jitsiLink === 'string' ? data.jitsiLink : '',
            isLaunched: Boolean(data.isLaunched),
          } satisfies StudySession;
        });
        setSessions(sortSessions(nextSessions));
        setSessionsLoading(false);
      },
      (error) => {
        console.error('Could not load study sessions', error);
        setSessionError('We couldn’t connect to your sessions. Check your connection and try again.');
        setSessionsLoading(false);
      },
    );

    return unsubscribe;
  }, [demoStorageKey, role, user.isDemo, user.uid]);

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((session) => {
        const end = new Date(session.end).getTime();
        return Number.isFinite(end) && end >= now;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return upcomingSessions;
    return upcomingSessions.filter((session) => (
      session.sessionName.toLowerCase().includes(normalizedSearch)
      || session.subject.toLowerCase().includes(normalizedSearch)
      || session.createdBy.toLowerCase().includes(normalizedSearch)
    ));
  }, [searchTerm, upcomingSessions]);

  const selectedDaySessions = sessions.filter((session) => isSameDay(new Date(session.start), selectedDate));

  const thisWeekSessions = useMemo(() => {
    const today = new Date();
    const interval = { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    return upcomingSessions.filter((session) => {
      const start = new Date(session.start);
      return Number.isFinite(start.getTime()) && isWithinInterval(start, interval);
    });
  }, [upcomingSessions]);

  const scheduledHours = thisWeekSessions.reduce((total, session) => {
    const duration = (new Date(session.end).getTime() - new Date(session.start).getTime()) / 3_600_000;
    return total + (Number.isFinite(duration) && duration > 0 ? duration : 0);
  }, 0);
  const hostedSessions = sessions.filter((session) => session.createdById === user.uid).length;
  const displaySessions = filteredSessions;
  const daysInWeek = eachDayOfInterval({
    start: startOfWeek(weekDate, { weekStartsOn: 1 }),
    end: endOfWeek(weekDate, { weekStartsOn: 1 }),
  });
  const currentStudyWeek = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const viewTitle: Record<DashboardView, string> = {
    overview: 'Overview',
    calendar: 'Your calendar',
    sessions: 'Study sessions',
    availability: 'Find a time together',
  };
  const viewDescription: Record<DashboardView, string> = {
    overview: 'A little structure goes a long way. Here’s your study week.',
    calendar: 'A clear view of what’s coming up, all in one place.',
    sessions: 'Find a session that fits your goals and your schedule.',
    availability: 'Find a shared study window that works for your group.',
  };

  const handleCreateSession = async (draft: SessionDraft) => {
    const { matchSelection, ...sessionDraft } = draft;
    const createdAt = new Date().toISOString();
    const newSession: Omit<StudySession, 'id'> = {
      ...sessionDraft,
      createdBy: user.displayName || user.email || 'StudySync host',
      createdById: user.uid,
      createdAt,
      jitsiLink: '',
      isLaunched: false,
    };

    if (user.isDemo) {
      const sessionId = `demo-${Date.now()}`;
      const demoSession: StudySession = { ...newSession, id: sessionId };
      const updated = sortSessions([...sessions, demoSession]);
      setSessions(updated);
      localStorage.setItem(demoStorageKey, JSON.stringify(updated));

      if (matchSelection) {
        const historyRecord: MatchHistoryRecord = {
          id: sessionId,
          sessionId,
          createdById: user.uid,
          createdAt,
          consideredMemberIds: matchSelection.consideredMemberIds,
          accommodatedMemberIds: matchSelection.accommodatedMemberIds,
        };
        appendDemoMatchHistory(user.uid, matchSelection.groupId, historyRecord);
        setMatchHistoryRevision((revision) => revision + 1);
      }

      toast.success('Session added to your demo calendar');
      return;
    }

    try {
      const sessionRef = doc(collection(db, 'sessions'));
      const batch = writeBatch(db);
      batch.set(sessionRef, newSession);
      if (matchSelection) {
        const historyRef = doc(db, 'studyGroups', matchSelection.groupId, 'matchHistory', sessionRef.id);
        batch.set(historyRef, {
          sessionId: sessionRef.id,
          createdById: user.uid,
          createdAt,
          consideredMemberIds: matchSelection.consideredMemberIds,
          accommodatedMemberIds: matchSelection.accommodatedMemberIds,
        });
      }
      await batch.commit();
      if (matchSelection) setMatchHistoryRevision((revision) => revision + 1);
      toast.success('Your session is on the calendar');
    } catch (error) {
      console.error('Could not create a session', error);
      throw new Error('We couldn’t save your session. Please try again.');
    }
  };

  const handleLaunchSession = async (session: StudySession) => {
    const jitsiLink = `https://meet.jit.si/studysync-${session.id}`;
    const roomWindow = window.open('about:blank', '_blank');
    if (roomWindow) roomWindow.opener = null;
    const openRoom = () => {
      if (roomWindow) roomWindow.location.replace(jitsiLink);
      else window.open(jitsiLink, '_blank', 'noopener,noreferrer');
    };

    if (user.isDemo) {
      const updated = sessions.map((item) => item.id === session.id ? { ...item, jitsiLink, isLaunched: true } : item);
      setSessions(updated);
      localStorage.setItem(demoStorageKey, JSON.stringify(updated));
      openRoom();
      toast.success('Your study room is ready');
      return;
    }

    try {
      await updateDoc(doc(db, 'sessions', session.id), { jitsiLink, isLaunched: true });
      openRoom();
      toast.success('Your study room is ready');
    } catch (error) {
      roomWindow?.close();
      console.error('Could not launch a session', error);
      toast.error('We couldn’t open the study room. Please try again.');
    }
  };

  const handleDeleteSession = async (session: StudySession) => {
    if (!window.confirm(`Delete “${session.sessionName}”? This can’t be undone.`)) return;
    if (user.isDemo) {
      const updated = sessions.filter((item) => item.id !== session.id);
      setSessions(updated);
      localStorage.setItem(demoStorageKey, JSON.stringify(updated));
      toast.success('Session removed from your demo calendar');
      return;
    }

    try {
      await deleteDoc(doc(db, 'sessions', session.id));
      toast.success('Session deleted');
    } catch (error) {
      console.error('Could not delete a session', error);
      toast.error('We couldn’t delete that session. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Could not sign out', error);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const openSessionForm = (initialValues?: Partial<SessionDraft>) => {
    setSessionFormInitialValues(initialValues);
    setShowSessionForm(true);
  };

  const closeSessionForm = () => {
    setShowSessionForm(false);
    setSessionFormInitialValues(undefined);
  };

  const renderSessionList = (items: StudySession[], emptyTitle?: string, emptyCopy?: string) => (
    sessionsLoading ? (
      <div className="session-skeletons" aria-label="Loading sessions">
        <span /><span /><span />
      </div>
    ) : sessionError ? (
      <div className="inline-error"><span>{sessionError}</span><button type="button" onClick={() => window.location.reload()}>Reload</button></div>
    ) : (
      <CalendarView
        sessions={items}
        role={role}
        currentUserId={user.uid}
        onLaunch={handleLaunchSession}
        onDelete={handleDeleteSession}
        emptyTitle={emptyTitle}
        emptyCopy={emptyCopy}
      />
    )
  );

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <button className="sidebar-brand" type="button" onClick={() => setActiveView('overview')} aria-label="StudySync overview">
          <span className="brand-mark">S</span>
          <span className="brand-name">study<span>sync</span></span>
        </button>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar-nav-item ${activeView === id ? 'is-active' : ''}`}
              onClick={() => setActiveView(id)}
              aria-current={activeView === id ? 'page' : undefined}
              title={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              {id === 'sessions' && upcomingSessions.length > 0 && <b className="nav-count">{upcomingSessions.length}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-tip">
          <span className="sidebar-tip-icon"><HiOutlineSparkles aria-hidden="true" /></span>
          <strong>Little by little.</strong>
          <p>Your next focused hour can change the whole week.</p>
        </div>
        <div className="sidebar-user">
          {user.photoURL ? <img src={user.photoURL} alt="" className="user-avatar" /> : <span className="user-avatar user-avatar--initials">{initials(user)}</span>}
          <span className="sidebar-user-copy"><strong>{user.displayName || user.email || 'StudySync student'}</strong><small>{role === 'host' ? 'Session host' : 'Student'}{user.isDemo ? ' · Demo' : ''}</small></span>
          <button className="sidebar-logout" type="button" onClick={() => void handleLogout()} aria-label="Sign out" title="Sign out">
            <HiOutlineArrowRightEndOnRectangle aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="topbar-title"><span>Workspace</span><HiOutlineChevronRight aria-hidden="true" /><strong>{viewTitle[activeView]}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <HiOutlineMagnifyingGlass aria-hidden="true" />
              <input type="search" placeholder="Search sessions…" aria-label="Search sessions" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              {searchTerm && <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')}><HiOutlineXMark aria-hidden="true" /></button>}
            </label>
            <button className="topbar-icon-button" type="button" aria-label="Notifications" title="You’re all caught up">
              <HiOutlineBell aria-hidden="true" /><i />
            </button>
            <span className="topbar-avatar-wrap">
              {user.photoURL ? <img src={user.photoURL} alt="" className="topbar-avatar" /> : <span className="topbar-avatar topbar-avatar--initials">{initials(user)}</span>}
            </span>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="page-heading">
            <div>
              <p className="page-date">{format(new Date(), 'EEEE, MMMM d')}</p>
              <h1>{activeView === 'overview' ? `${getFriendlyGreeting()}, ${firstName(user)}.` : viewTitle[activeView]}</h1>
              <p className="page-subtitle">{viewDescription[activeView]}</p>
            </div>
            <div className="page-heading-actions">
              {role === 'host' ? (
                <button className="button button--primary" type="button" onClick={() => openSessionForm()}><HiOutlinePlus aria-hidden="true" /> Create session</button>
              ) : (
                <button className="button button--primary" type="button" onClick={() => setActiveView('sessions')}><HiOutlineMagnifyingGlass aria-hidden="true" /> Find a session</button>
              )}
            </div>
          </div>

          {activeView === 'overview' && (
            <>
              <section className="welcome-banner">
                <div className="welcome-banner-copy">
                  <span className="welcome-banner-kicker"><i /> YOUR STUDY SPACE, ALL IN SYNC</span>
                  <h2>Turn “we should study”<br /><span>into a plan.</span></h2>
                  <p>Show up for your goals, and make the hard stuff a little easier together.</p>
                  <button className="banner-cta" type="button" onClick={() => role === 'host' ? openSessionForm() : setActiveView('sessions')}>
                    {role === 'host' ? 'Plan a study session' : 'Explore study sessions'} <HiOutlineArrowRight aria-hidden="true" />
                  </button>
                  <div className="banner-note"><HiOutlineCheck aria-hidden="true" /> Better together, one session at a time</div>
                </div>
                <div className="welcome-illustration" aria-hidden="true">
                  <div className="illustration-glow" />
                  <div className="orbit orbit--one" />
                  <div className="orbit orbit--two" />
                  <div className="hero-calendar-card">
                    <div className="hero-calendar-head"><span>YOUR NEXT SESSION</span><i><HiOutlineCalendarDays /></i></div>
                    <strong>{upcomingSessions[0]?.sessionName || 'A fresh start'}</strong>
                    <span className="hero-session-time"><HiOutlineClock /> {upcomingSessions[0] ? format(new Date(upcomingSessions[0].start), 'EEE, MMM d · h:mm a') : 'Make your first plan'}</span>
                    <div className="hero-calendar-bottom"><span className="hero-face hero-face--one">J</span><span className="hero-face hero-face--two">A</span><span className="hero-face hero-face--three">P</span><span>good company included</span></div>
                  </div>
                  <div className="hero-sparkle hero-sparkle--one"><HiOutlineSparkles /></div>
                  <div className="hero-sparkle hero-sparkle--two">✳</div>
                  <div className="hero-floating-note"><span className="floating-note-icon"><HiOutlineChartBar /></span><span><b>Focus looks good</b><small>{thisWeekSessions.length} sessions this week</small></span></div>
                </div>
              </section>

              <section className="stats-grid" aria-label="Your study summary">
                <article className="stat-card">
                  <span className="stat-icon stat-icon--lavender"><HiOutlineCalendarDays aria-hidden="true" /></span>
                  <span className="stat-copy"><small>THIS WEEK</small><strong>{thisWeekSessions.length.toString().padStart(2, '0')} <em>sessions</em></strong><span>on your calendar</span></span>
                  <span className="stat-decoration stat-decoration--lavender">↗</span>
                </article>
                <article className="stat-card">
                  <span className="stat-icon stat-icon--mint"><HiOutlineClock aria-hidden="true" /></span>
                  <span className="stat-copy"><small>TIME SET ASIDE</small><strong>{scheduledHours.toFixed(1)} <em>hrs</em></strong><span>planned for this week</span></span>
                  <span className="stat-decoration stat-decoration--mint">✳</span>
                </article>
                <article className="stat-card">
                  <span className="stat-icon stat-icon--peach"><HiOutlineAcademicCap aria-hidden="true" /></span>
                  <span className="stat-copy"><small>YOUR IMPACT</small><strong>{hostedSessions.toString().padStart(2, '0')} <em>hosted</em></strong><span>sessions you’ve created</span></span>
                  <span className="stat-decoration stat-decoration--peach">↗</span>
                </article>
              </section>

              <div className="overview-grid">
                <section className="content-panel upcoming-panel">
                  <header className="panel-heading">
                    <div><span className="panel-overline">ON THE HORIZON</span><h2>Upcoming sessions <span className="heading-count">{upcomingSessions.length}</span></h2></div>
                    <button className="text-link" type="button" onClick={() => setActiveView('sessions')}>View all <HiOutlineArrowRight aria-hidden="true" /></button>
                  </header>
                  {renderSessionList(displaySessions.slice(0, 3), 'Your calendar is wide open', role === 'host' ? 'Create a session and bring your study group together.' : 'Explore the schedule and find your next study buddy.')}
                </section>

                <div className="overview-aside">
                  <section className="content-panel rhythm-panel">
                    <header className="panel-heading panel-heading--compact">
                      <div><span className="panel-overline">A GENTLE RHYTHM</span><h2>This week</h2></div>
                      <span className="rhythm-icon"><HiOutlineChartBar aria-hidden="true" /></span>
                    </header>
                    <div className="weekly-chart" role="img" aria-label={`Study sessions planned across the week: ${thisWeekSessions.length} total`}>
                      {weekdays.map((dayName, dayIndex) => {
                        const day = currentStudyWeek[dayIndex];
                        const hours = thisWeekSessions.reduce((sum, session) => {
                          const start = new Date(session.start);
                          const end = new Date(session.end);
                          if (!isSameDay(start, day)) return sum;
                          const duration = (end.getTime() - start.getTime()) / 3_600_000;
                          return sum + (duration > 0 && Number.isFinite(duration) ? duration : 0);
                        }, 0);
                        const height = hours > 0 ? Math.min(100, Math.max(22, (hours / 2.5) * 100)) : 14;
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div className={`chart-day ${isToday ? 'is-today' : ''}`} key={dayName}>
                            <div className="chart-track"><span className={hours > 0 ? 'has-hours' : ''} style={{ height: `${height}%` }} /></div>
                            <span>{dayName.slice(0, 1)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="chart-legend"><span><i /> Planned study time</span><span>{thisWeekSessions.length} session{thisWeekSessions.length === 1 ? '' : 's'}</span></div>
                  </section>

                  <section className="focus-note">
                    <span className="focus-note-icon"><HiOutlineSparkles aria-hidden="true" /></span>
                    <span className="focus-note-label">A NOTE TO SELF</span>
                    <h3>Progress loves a plan.</h3>
                    <p>Even one focused session can make a busy week feel more manageable.</p>
                    <button type="button" onClick={() => setActiveView('availability')}>Find a time together <HiOutlineArrowRight aria-hidden="true" /></button>
                  </section>
                </div>
              </div>
            </>
          )}

          {activeView === 'calendar' && (
            <section className="content-panel calendar-panel">
              <div className="calendar-toolbar">
                <div><span className="panel-overline">YOUR WEEK</span><h2>{format(daysInWeek[0], 'MMM d')} – {format(daysInWeek[6], 'MMM d, yyyy')}</h2></div>
                <div className="calendar-controls">
                  <button className="icon-button" type="button" aria-label="Previous week" onClick={() => { setWeekDate((value) => addWeeks(value, -1)); setSelectedDate((value) => addDays(value, -7)); }}><HiOutlineArrowLeft aria-hidden="true" /></button>
                  <button className="button button--quiet button--today" type="button" onClick={() => { const today = new Date(); setWeekDate(today); setSelectedDate(startOfDay(today)); }}>Today</button>
                  <button className="icon-button" type="button" aria-label="Next week" onClick={() => { setWeekDate((value) => addWeeks(value, 1)); setSelectedDate((value) => addDays(value, 7)); }}><HiOutlineArrowRight aria-hidden="true" /></button>
                </div>
              </div>
              <div className="week-strip" role="group" aria-label="Choose a day">
                {daysInWeek.map((day) => {
                  const daySessions = sessions.filter((session) => isSameDay(new Date(session.start), day));
                  return (
                    <button key={day.toISOString()} type="button" className={`week-day ${isSameDay(day, selectedDate) ? 'is-selected' : ''} ${isSameDay(day, new Date()) ? 'is-today' : ''}`} onClick={() => setSelectedDate(startOfDay(day))} aria-pressed={isSameDay(day, selectedDate)}>
                      <span>{format(day, 'EEE')}</span><strong>{format(day, 'd')}</strong><i className={daySessions.length ? 'has-events' : ''} />
                    </button>
                  );
                })}
              </div>
              <div className="calendar-day-heading"><h3>{isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}</h3><span>{selectedDaySessions.length} session{selectedDaySessions.length === 1 ? '' : 's'}</span></div>
              {renderSessionList(selectedDaySessions, 'A clear day', 'No sessions are planned for this day. Enjoy the breathing room or find a study session.')}
            </section>
          )}

          {activeView === 'sessions' && (
            <section className="content-panel all-sessions-panel">
              <header className="panel-heading">
                <div><span className="panel-overline">YOUR STUDY COMMUNITY</span><h2>All upcoming sessions <span className="heading-count">{filteredSessions.length}</span></h2></div>
                <span className="session-filter-note"><HiOutlineCheck aria-hidden="true" /> Updated in real time</span>
              </header>
              {renderSessionList(displaySessions, 'No sessions match just yet', searchTerm ? 'Try a different search, or clear the search field above.' : 'There’s nothing on the schedule right now. Check back soon or start a session of your own.')}
            </section>
          )}

          {activeView === 'availability' && <TimeMatch user={user} role={role} historyRefreshKey={matchHistoryRevision} onSchedule={openSessionForm} />}

          <footer className="dashboard-footer"><span>StudySync <b>✳</b> make room for better study</span><span>{user.isDemo ? 'Demo workspace · changes are saved in this browser' : 'Your study space, all in sync'}</span></footer>
        </div>
      </main>

      {showSessionForm && <SessionForm onClose={closeSessionForm} onCreate={handleCreateSession} initialValues={sessionFormInitialValues} />}
    </div>
  );
}

export default Dashboard;

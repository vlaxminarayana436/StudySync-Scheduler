import { useState } from 'react';
import { format } from 'date-fns';
import { HiOutlineArrowTopRightOnSquare, HiOutlineCalendarDays, HiOutlineClock, HiOutlinePlayCircle, HiOutlineTrash, HiOutlineUserGroup, HiOutlineVideoCamera } from 'react-icons/hi2';
import type { StudySession, UserRole } from '../types';

interface CalendarViewProps {
  sessions: StudySession[];
  role: UserRole;
  currentUserId: string;
  onLaunch: (session: StudySession) => Promise<void>;
  onDelete: (session: StudySession) => Promise<void>;
  emptyTitle?: string;
  emptyCopy?: string;
}

function displayDate(value: string, pattern: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time to be confirmed' : format(date, pattern);
}

function subjectClass(subject: string): string {
  const normalized = subject.toLowerCase();
  if (normalized.includes('math')) return 'subject-math';
  if (normalized.includes('chem')) return 'subject-chemistry';
  if (normalized.includes('computer') || normalized.includes('science')) return 'subject-computing';
  if (normalized.includes('biology')) return 'subject-biology';
  return 'subject-general';
}

const CalendarView: React.FC<CalendarViewProps> = ({
  sessions,
  role,
  currentUserId,
  onLaunch,
  onDelete,
  emptyTitle = 'Nothing on the calendar yet',
  emptyCopy = 'When a session is scheduled, you’ll find all the details here.',
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const runAction = async (session: StudySession, action: (session: StudySession) => Promise<void>) => {
    setBusyId(session.id);
    try {
      await action(session);
    } finally {
      setBusyId(null);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="empty-sessions">
        <span className="empty-calendar-icon"><HiOutlineCalendarDays aria-hidden="true" /></span>
        <strong>{emptyTitle}</strong>
        <p>{emptyCopy}</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      {sessions.map((session) => {
        const canManage = role === 'host' && (!session.createdById || session.createdById === currentUserId || currentUserId.startsWith('demo-'));
        const roomReady = Boolean(session.jitsiLink);
        const subjectTone = subjectClass(session.subject || 'Other');

        return (
          <article className={`session-card ${subjectTone}`} key={session.id}>
            <div className="session-date-block" aria-label={displayDate(session.start, 'EEEE, MMMM d')}>
              <span>{displayDate(session.start, 'MMM')}</span>
              <strong>{displayDate(session.start, 'dd')}</strong>
              <small>{displayDate(session.start, 'EEE')}</small>
            </div>

            <div className="session-card-content">
              <div className="session-card-title-row">
                <span className={`subject-chip ${subjectTone}`}>{session.subject || 'Study session'}</span>
                {roomReady && <span className="room-live-chip"><i /> ROOM OPEN</span>}
              </div>
              <h3>{session.sessionName || 'Study session'}</h3>
              {session.description && <p className="session-description">{session.description}</p>}
              <div className="session-meta">
                <span><HiOutlineClock aria-hidden="true" /> {displayDate(session.start, 'h:mm a')} – {displayDate(session.end, 'h:mm a')}</span>
                <span><HiOutlineUserGroup aria-hidden="true" /> {session.groupName ? `Group: ${session.groupName}` : `Hosted by ${session.createdBy || 'a study buddy'}`}</span>
              </div>
            </div>

            <div className="session-card-actions">
              {roomReady ? (
                <a className="button button--join" href={session.jitsiLink} target="_blank" rel="noopener noreferrer">
                  <HiOutlineArrowTopRightOnSquare aria-hidden="true" /> Join room
                </a>
              ) : canManage ? (
                <button className="button button--launch" type="button" onClick={() => void runAction(session, onLaunch)} disabled={busyId === session.id}>
                  {busyId === session.id ? <span className="button-spinner button-spinner--light" /> : <HiOutlineVideoCamera aria-hidden="true" />}
                  {busyId === session.id ? 'Opening…' : 'Launch room'}
                </button>
              ) : (
                <span className="room-waiting"><HiOutlinePlayCircle aria-hidden="true" /> Waiting for host</span>
              )}
              {canManage && (
                <button className="session-delete" type="button" aria-label={`Delete ${session.sessionName}`} title="Delete session" onClick={() => void runAction(session, onDelete)} disabled={busyId === session.id}>
                  <HiOutlineTrash aria-hidden="true" />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default CalendarView;

import { format } from 'date-fns';
import { HiOutlineCalendarDays, HiOutlineClock } from 'react-icons/hi2';
import type { StudySession } from '../types';

interface SessionListProps {
  sessions: StudySession[];
}

const SessionList: React.FC<SessionListProps> = ({ sessions }) => {
  if (sessions.length === 0) {
    return <p className="session-list-empty">No study sessions scheduled yet.</p>;
  }

  return (
    <ul className="simple-session-list">
      {sessions.map((session) => {
        const start = new Date(session.start);
        const end = new Date(session.end);
        const validStart = Number.isNaN(start.getTime()) ? null : start;
        const validEnd = Number.isNaN(end.getTime()) ? null : end;

        return (
          <li key={session.id}>
            <span className="simple-session-mark" aria-hidden="true" />
            <div>
              <strong>{session.sessionName}</strong>
              <span className="simple-session-meta">
                {session.subject || 'Study session'} · Hosted by {session.createdBy || 'a study buddy'}
              </span>
            </div>
            <span className="simple-session-time">
              {validStart ? <><HiOutlineCalendarDays aria-hidden="true" /> {format(validStart, 'MMM d')}</> : null}
              {validStart ? <><HiOutlineClock aria-hidden="true" /> {format(validStart, 'h:mm a')}{validEnd ? ` – ${format(validEnd, 'h:mm a')}` : ''}</> : 'Time to be confirmed'}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default SessionList;

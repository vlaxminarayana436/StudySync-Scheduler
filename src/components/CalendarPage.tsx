import Dashboard from './Dashboard';
import type { StudySyncUser, UserRole } from '../types';

interface CalendarPageProps {
  user: StudySyncUser;
  role: UserRole;
  onLogout: () => void | Promise<void>;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ user, role, onLogout }) => (
  <Dashboard user={user} role={role} onLogout={onLogout} />
);

export default CalendarPage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';

interface CalendarPageProps {
  role: 'host' | 'member' | null;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ role }) => {
  const navigate = useNavigate();

  // If role is missing or invalid, redirect to login
  if (!role) {
    navigate('/');
    return null; // Prevent rendering while navigating
  }

  return <Dashboard role={role} />;
};

export default CalendarPage;

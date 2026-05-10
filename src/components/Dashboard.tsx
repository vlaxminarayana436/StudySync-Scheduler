import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../utils/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import SessionForm from './SessionForm';
import CalendarView from './CalendarView';
import { motion } from 'framer-motion';

interface DashboardProps {
  role?: 'host' | 'member' | null;
}

const Dashboard: React.FC<DashboardProps> = ({ role }) => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [sessions, setSessions] = useState<any[]>([]);
  const [resolvedRole, setResolvedRole] = useState<'host' | 'member' | null>(role || null);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('role');
    navigate('/');
  };

  useEffect(() => {
    // Fallback to localStorage role if not passed as prop
    if (!resolvedRole) {
      const storedRole = localStorage.getItem('role') as 'host' | 'member' | null;
      setResolvedRole(storedRole);
    }

    const q = query(collection(db, 'sessions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSessions(data);
    });

    return () => unsubscribe();
  }, [resolvedRole]);

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white overflow-hidden"
      style={{
        backgroundImage: `url('/studyonline.png')`,
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="bg-gradient-to-br from-purple-900/90 via-indigo-900/80 to-pink-900/90 min-h-screen w-full px-6 pt-6 pb-10 backdrop-blur-sm">
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="flex justify-between items-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-4">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt="profile"
                  className="w-12 h-12 rounded-full border-2 border-pink-400 shadow-md"
                />
              )}
              <div>
                <p className="text-2xl font-bold text-white drop-shadow-lg">
                  Welcome, {user?.displayName || user?.email}!
                </p>
                <p className="text-sm text-pink-200 capitalize">Role: {resolvedRole}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-md shadow hover:bg-red-600 transition"
            >
              Logout
            </button>
          </motion.div>

          {/* Host-only Session Form */}
          {resolvedRole === 'host' && (
            <motion.div
              className="mb-12 bg-white/10 p-6 rounded-lg backdrop-blur-md shadow-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SessionForm />
            </motion.div>
          )}

          <motion.div
            className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-pink-400 scrollbar-track-pink-100 pr-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <CalendarView sessions={sessions} role={resolvedRole || 'member'} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;

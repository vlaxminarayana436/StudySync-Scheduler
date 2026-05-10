import React from 'react';
import { format } from 'date-fns';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface Session {
  id: string;
  sessionName: string;
  start: string;
  end: string;
  createdBy: string;
  jitsiLink?: string;
}

interface Props {
  role: 'host' | 'member';
  sessions: Session[];
}

const CalendarView: React.FC<Props> = ({ role, sessions }) => {
  const handleLaunchSession = async (sessionId: string) => {
    const jitsiLink = `https://meet.jit.si/study-${sessionId}`;
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, { jitsiLink });
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirm = window.confirm('Are you sure you want to delete this session?');
    if (!confirm) return;
    await deleteDoc(doc(db, 'sessions', sessionId));
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-4xl font-bold text-white mb-4 font-poppins animate-fadeIn">
        Upcoming Sessions
      </h2>

      {sessions.length === 0 ? (
        <p className="text-white/70 italic">No sessions scheduled.</p>
      ) : (
        sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/30 shadow-lg p-6 flex justify-between items-center transition-all hover:shadow-2xl hover:scale-[1.01]"
          >
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{session.sessionName}</h3>
              <p className="text-sm text-pink-200">
                {format(new Date(session.start), 'PPpp')} → {format(new Date(session.end), 'PPpp')}
              </p>
              <p className="text-xs text-white/60 mt-1">Hosted by: {session.createdBy}</p>
            </div>

            <div className="flex gap-2 items-center">
              {role === 'host' ? (
                <>
                  {session.jitsiLink ? (
                    <a
                      href={session.jitsiLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition"
                    >
                      Join
                    </a>
                  ) : (
                    <button
                      onClick={() => handleLaunchSession(session.id)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded shadow transition"
                    >
                      Launch
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded shadow transition"
                  >
                    Delete
                  </button>
                </>
              ) : session.jitsiLink ? (
                <a
                  href={session.jitsiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition"
                >
                  Join
                </a>
              ) : (
                <span className="text-yellow-300 font-medium italic">⏳ Wait for Host</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CalendarView;

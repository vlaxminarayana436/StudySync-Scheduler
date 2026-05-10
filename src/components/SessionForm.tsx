import React, { useState } from 'react';
import { db, auth } from '../utils/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { motion } from 'framer-motion';

const SessionForm = () => {
  const [sessionName, setSessionName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateSession = async () => {
    setError(''); // Reset error before every submission

    // Validate inputs
    if (!sessionName || !startTime || !endTime) {
      setError('Please fill in all fields.');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if start time is before end time
    if (start >= end) {
      setError('Start time must be before end time.');
      return;
    }

    // Check if the user is a host
    const role = localStorage.getItem('role');
    if (role !== 'host') {
      setError('Only hosts can create sessions.');
      return;
    }

    const hostName = auth.currentUser?.displayName || auth.currentUser?.email;

    try {
      setLoading(true); // Set loading state to true

      // Add new session to Firestore
      await addDoc(collection(db, 'sessions'), {
        sessionName,
        start: start.toISOString(),
        end: end.toISOString(),
        createdBy: hostName,
        createdAt: new Date().toISOString(),
      });

      // Clear the form after successful submission
      setSessionName('');
      setStartTime('');
      setEndTime('');
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session. Try again.');
    } finally {
      setLoading(false); // Reset loading state after the request
    }
  };

  return (
    <motion.div
      className="bg-white/10 backdrop-blur-lg text-white p-6 rounded-2xl shadow-xl border border-white/20 max-w-lg mx-auto font-sans"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-xl font-bold mb-4 text-pink-400">🎯 Create a Session</h2>

      <div className="space-y-4">
        {/* Session Name Input */}
        <input
          type="text"
          placeholder="Session Name"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="w-full p-3 rounded-lg border border-white/30 bg-white/10 placeholder-indigo-200 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        />

        {/* Start Time Input */}
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full p-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />

        {/* End Time Input */}
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full p-3 rounded-lg border border-white/30 bg-white/10 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />

        {/* Error Message */}
        {error && (
          <p className="text-red-400 text-sm font-medium mt-1">{error}</p>
        )}

        {/* Create Session Button */}
        <button
          onClick={handleCreateSession}
          disabled={loading}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-md shadow-md transition mt-4"
        >
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </div>
    </motion.div>
  );
};

export default SessionForm;

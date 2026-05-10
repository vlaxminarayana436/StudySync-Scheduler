import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import CalendarPage from './components/CalendarPage';
import { AnimatePresence, motion } from 'framer-motion';

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

function App() {
  const location = useLocation();
  
  // Update the role state type to 'host' | 'member' | null
  const [role, setRole] = useState<"host" | "member" | null>(null);

  // Set role based on localStorage or default to null if not found
  useEffect(() => {
    const storedRole = localStorage.getItem('role') as "host" | "member" | null;
    setRole(storedRole || null);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div {...pageTransition} transition={{ duration: 0.4 }}>
              {/* Pass setRole function to AuthForm */}
              <AuthForm setRole={setRole} />
            </motion.div>
          }
        />
        <Route
          path="/dashboard"
          element={
            <motion.div {...pageTransition} transition={{ duration: 0.4 }}>
              {/* Pass the role as "host" | "member" | null to CalendarPage */}
              <CalendarPage role={role} />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default App;

import React, { useState } from 'react';
import { auth, provider } from '../utils/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface AuthFormProps {
  setRole: React.Dispatch<React.SetStateAction<'host' | 'member' | null>>;
}

const AuthForm: React.FC<AuthFormProps> = ({ setRole }) => {
  const [role, setRoleState] = useState<'host' | 'member' | ''>('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (!role) {
      alert('Please select a role before signing in.');
      return;
    }

    try {
      await signInWithPopup(auth, provider);

      // Save role for access in other components
      localStorage.setItem('role', role);
      sessionStorage.setItem('role', role);

      // Update the role state in the parent component
      setRole(role);

      // Redirect to the dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google Sign-In failed', error);
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-800 to-violet-700 px-4 font-sans">
      <motion.div
        className="bg-cover bg-center p-10 w-full max-w-md shadow-2xl border border-white/20 text-white rounded-xl"
        style={{ backgroundImage: 'url(/stud.png)' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo and App Name */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-3 drop-shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-widest text-white text-center font-anton">
            Study Scheduler
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-lg md:text-xl text-white font-semibold mb-6 text-center">
          Student Success Network.
        </p>

        {/* Role Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-white">Select your role:</label>
          <select
            value={role}
            onChange={(e) => setRoleState(e.target.value as 'host' | 'member')}
            className="w-full p-3 bg-white text-black font-semibold rounded-md border border-white/30 focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
          >
            <option value="">-- Choose Role --</option>
            <option value="host">Host</option>
            <option value="member">Member</option>
          </select>
        </div>

        {/* Sign-in Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGoogleSignIn}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-md shadow-md transition"
        >
          🚀 Sign in with Google
        </motion.button>
      </motion.div>
    </div>
  );
};

export default AuthForm;

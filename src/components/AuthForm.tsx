import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { HiOutlineAcademicCap, HiOutlineArrowRight, HiOutlineCalendarDays, HiOutlineCheckCircle, HiOutlineClock, HiOutlineSparkles, HiOutlineUserGroup } from 'react-icons/hi2';
import { auth, provider } from '../utils/firebase';
import type { StudySyncUser, UserRole } from '../types';

interface AuthFormProps {
  user: StudySyncUser | null;
  initialRole: UserRole | null;
  onAuthenticated: (role: UserRole, user?: StudySyncUser) => void;
  onDemo: (role: UserRole) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ user, initialRole, onAuthenticated, onDemo }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');
    setLoading(true);

    if (user) {
      onAuthenticated(selectedRole, user);
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      onAuthenticated(selectedRole, result.user);
    } catch (signInError) {
      console.error('Google sign-in failed', signInError);
      const message = signInError instanceof Error ? signInError.message : 'Something went wrong. Please try again.';
      setError(message.replace('Firebase: ', '').replace(/ \(auth\/[^)]+\)\.?/, '.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="About StudySync">
        <div className="auth-orb auth-orb--one" />
        <div className="auth-orb auth-orb--two" />
        <div className="story-grid" />

        <header className="auth-brand">
          <span className="brand-mark">S</span>
          <span className="brand-name">study<span>sync</span></span>
          <span className="brand-beta">BETA</span>
        </header>

        <div className="story-content">
          <div className="story-kicker"><span className="live-dot" /> YOUR CAMPUS, IN SYNC</div>
          <h1>Make time<br />for <span>great things.</span></h1>
          <p className="story-copy">
            Skip the endless “when are you free?” thread. Share a few open windows, find the fairest overlap, and turn it into a study session.
          </p>

          <div className="story-preview" aria-label="A preview of your StudySync week">
            <div className="preview-head">
              <div>
                <span className="preview-label">YOUR WEEK AT A GLANCE</span>
                <strong>Small steps, big progress.</strong>
              </div>
              <span className="preview-week">THIS WEEK <HiOutlineArrowRight aria-hidden="true" /></span>
            </div>
            <div className="preview-stats">
              <div className="preview-stat">
                <span className="preview-stat-icon preview-stat-icon--mint"><HiOutlineCalendarDays /></span>
                <span><strong>03</strong><small>study sessions</small></span>
              </div>
              <div className="preview-divider" />
              <div className="preview-stat">
                <span className="preview-stat-icon preview-stat-icon--violet"><HiOutlineClock /></span>
                <span><strong>4.5 <small>hrs</small></strong><small>focused together</small></span>
              </div>
            </div>
            <div className="preview-sessions">
              <div className="preview-session">
                <span className="preview-session-line preview-session-line--mint" />
                <span className="preview-session-time">10:30</span>
                <span className="preview-session-title">Calculus study sprint</span>
                <span className="preview-avatar-stack"><i>A</i><i>M</i><i>+2</i></span>
              </div>
              <div className="preview-session">
                <span className="preview-session-line preview-session-line--lilac" />
                <span className="preview-session-time">16:00</span>
                <span className="preview-session-title">Organic chemistry</span>
                <span className="preview-avatar-stack"><i>P</i><i>J</i><i>+1</i></span>
              </div>
            </div>
            <div className="preview-float"><HiOutlineSparkles aria-hidden="true" /><span>Good plans<br /><strong>make room</strong></span></div>
          </div>

          <div className="story-proof">
            <div className="proof-avatars"><span>J</span><span>A</span><span>P</span><span>+</span></div>
            <span>Better together, one session at a time.</span>
          </div>
        </div>

        <div className="auth-story-footer">
          <span>© 2026 StudySync</span>
          <span><HiOutlineCheckCircle aria-hidden="true" /> Built for better study habits</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <span className="brand-mark">S</span><span className="brand-name">study<span>sync</span></span>
          </div>
          <div className="auth-card">
            <span className="auth-card-kicker"><HiOutlineSparkles aria-hidden="true" /> YOUR NEXT STUDY SESSION STARTS HERE</span>
            <h2>{user ? 'Welcome back.' : 'Find your people.'}</h2>
            <p className="auth-subtitle">Choose how you’ll use StudySync. You can always change this later.</p>

            <div className="role-picker" aria-label="Choose your StudySync role">
              <button
                type="button"
                className={`role-option ${selectedRole === 'member' ? 'is-selected' : ''}`}
                onClick={() => setSelectedRole('member')}
                aria-pressed={selectedRole === 'member'}
              >
                <span className="role-icon role-icon--member"><HiOutlineUserGroup aria-hidden="true" /></span>
                <span className="role-copy"><strong>Student</strong><small>Join study sessions</small></span>
                <span className="role-radio" />
              </button>
              <button
                type="button"
                className={`role-option ${selectedRole === 'host' ? 'is-selected' : ''}`}
                onClick={() => setSelectedRole('host')}
                aria-pressed={selectedRole === 'host'}
              >
                <span className="role-icon role-icon--host"><HiOutlineAcademicCap aria-hidden="true" /></span>
                <span className="role-copy"><strong>Session host</strong><small>Bring a group together</small></span>
                <span className="role-radio" />
              </button>
            </div>

            {error && <div className="form-alert" role="alert">{error}</div>}

            <button className="google-button" type="button" onClick={handleContinue} disabled={loading}>
              {loading ? <span className="button-spinner" /> : user ? (
                <span className="continue-avatar">{(user.displayName || user.email || 'S').slice(0, 1).toUpperCase()}</span>
              ) : (
                <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.91c-.58 2.96-2.27 5.48-4.78 7.18l7.73 6C44.37 38.08 46.98 31.8 46.98 24.55Z" />
                  <path fill="#FBBC05" d="M10.53 28.59a14.45 14.45 0 0 1 0-9.18l-7.98-6.19a23.94 23.94 0 0 0 0 21.56l7.98-6.19Z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.94-2.13 15.92-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.19 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                </svg>
              )}
              <span>{loading ? 'Connecting…' : user ? `Continue as ${user.displayName || user.email || 'student'}` : 'Continue with Google'}</span>
              {!loading && <HiOutlineArrowRight className="google-arrow" aria-hidden="true" />}
            </button>

            <div className="auth-separator"><span />or<span /></div>

            <button className="demo-button" type="button" onClick={() => onDemo(selectedRole)}>
              <span className="demo-button-icon"><HiOutlineSparkles aria-hidden="true" /></span>
              <span><strong>Explore the demo</strong><small>Take a look around — no account needed</small></span>
              <HiOutlineArrowRight className="demo-arrow" aria-hidden="true" />
            </button>

            <p className="auth-terms">By continuing, you agree to keep your study space<br className="desktop-break" /> kind, focused, and welcoming.</p>
          </div>
          <div className="auth-panel-foot"><span>Made for curious minds</span><span className="foot-sparkle">✳</span><span>Made to make it easier</span></div>
        </div>
      </section>
    </main>
  );
};

export default AuthForm;

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
const AuthForm = lazy(() => import('./components/AuthForm'));
const CalendarPage = lazy(() => import('./components/CalendarPage'));
import { auth } from './utils/firebase';
import type { StudySyncUser, UserRole } from './types';

function isUserRole(value: string | null): value is UserRole {
  return value === 'host' || value === 'member';
}

function LoadingScreen() {
  return (
    <div className="app-loading" role="status" aria-label="Loading StudySync">
      <span className="brand-mark brand-mark--loading">S</span>
      <span className="loading-dot" />
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StudySyncUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(() => {
    const savedRole = localStorage.getItem('studysync-role') || localStorage.getItem('role');
    return isUserRole(savedRole) ? savedRole : null;
  });
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else if (sessionStorage.getItem('studysync-demo') === 'true') {
        const savedRole = sessionStorage.getItem('studysync-demo-role');
        if (isUserRole(savedRole)) {
          setRole(savedRole);
          setUser({
            uid: `demo-${savedRole}`,
            displayName: savedRole === 'host' ? 'Alex Morgan' : 'Jamie Chen',
            email: 'hello@studysync.demo',
            photoURL: null,
            isDemo: true,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const saveRole = useCallback((nextRole: UserRole) => {
    localStorage.setItem('studysync-role', nextRole);
    localStorage.setItem('role', nextRole);
    setRole(nextRole);
  }, []);

  const handleAuthenticated = useCallback((nextRole: UserRole, authenticatedUser?: StudySyncUser) => {
    saveRole(nextRole);
    sessionStorage.removeItem('studysync-demo');
    sessionStorage.removeItem('studysync-demo-role');
    if (authenticatedUser) setUser(authenticatedUser);
    navigate('/dashboard', { replace: true });
  }, [navigate, saveRole]);

  const handleDemo = useCallback((nextRole: UserRole) => {
    saveRole(nextRole);
    sessionStorage.setItem('studysync-demo', 'true');
    sessionStorage.setItem('studysync-demo-role', nextRole);
    if (user && !user.isDemo) void signOut(auth).catch((error) => console.warn('Could not clear an existing Firebase session', error));
    setUser({
      uid: `demo-${nextRole}`,
      displayName: nextRole === 'host' ? 'Alex Morgan' : 'Jamie Chen',
      email: 'hello@studysync.demo',
      photoURL: null,
      isDemo: true,
    });
    navigate('/dashboard', { replace: true });
  }, [navigate, saveRole, user]);

  const handleLogout = useCallback(async () => {
    if (user?.isDemo) {
      sessionStorage.removeItem('studysync-demo');
      sessionStorage.removeItem('studysync-demo-role');
    } else {
      await signOut(auth);
    }
    localStorage.removeItem('studysync-role');
    localStorage.removeItem('role');
    setRole(null);
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate, user]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '14px', background: '#17182f', color: '#fff', fontSize: '13px' },
          success: { iconTheme: { primary: '#89ddae', secondary: '#17182f' } },
        }}
      />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/"
            element={
              !authReady ? <LoadingScreen /> : user && role ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <div className="route-frame">
                  <AuthForm
                    user={user}
                    initialRole={role}
                    onAuthenticated={handleAuthenticated}
                    onDemo={handleDemo}
                  />
                </div>
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              !authReady ? <LoadingScreen /> : !user || !role ? (
                <Navigate to="/" replace />
              ) : (
                <div className="route-frame">
                  <CalendarPage user={user} role={role} onLogout={handleLogout} />
                </div>
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;

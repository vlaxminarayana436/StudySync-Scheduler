import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDRFUFW15JzDVM8cBBQY6p2oyy41ZYUhE0',
  authDomain: 'study-scheduler-3c270.firebaseapp.com',
  projectId: 'study-scheduler-3c270',
  storageBucket: 'study-scheduler-3c270.firebasestorage.app',
  messagingSenderId: '173578767409',
  appId: '1:173578767409:web:dd4e9262d859956c2bd910',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

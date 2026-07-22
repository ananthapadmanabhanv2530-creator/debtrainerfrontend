import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Rate limiting settings per email address
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const getAttemptsKey = (email) => `login_attempts_${email.trim().toLowerCase()}`;

const checkRateLimit = (email) => {
  const key = getAttemptsKey(email);
  const data = JSON.parse(localStorage.getItem(key) || '{}');

  if (data.lockoutUntil) {
    if (Date.now() < data.lockoutUntil) {
      const remainingMs = data.lockoutUntil - Date.now();
      const minutes = Math.ceil(remainingMs / 60000);
      const error = new Error(`Account login temporarily disabled for ${email} due to 3 failed password attempts. Please try again in ${minutes} minute(s).`);
      error.code = 'auth/account-disabled-rate-limit';
      throw error;
    } else {
      // Lockout expired — clear history
      localStorage.removeItem(key);
    }
  }
};

const recordFailedAttempt = (email) => {
  const key = getAttemptsKey(email);
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  const attempts = (data.count || 0) + 1;

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(key, JSON.stringify({ count: attempts, lockoutUntil }));
    const error = new Error(`Account login for ${email} has been disabled for 15 minutes due to 3 failed password attempts.`);
    error.code = 'auth/account-disabled-rate-limit';
    throw error;
  } else {
    localStorage.setItem(key, JSON.stringify({ count: attempts }));
    const remaining = MAX_FAILED_ATTEMPTS - attempts;
    const error = new Error(`Invalid email or password. You have ${remaining} attempt(s) remaining before login is disabled.`);
    error.code = 'auth/invalid-credentials-warning';
    throw error;
  }
};

const clearFailedAttempts = (email) => {
  const key = getAttemptsKey(email);
  localStorage.removeItem(key);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync with backend on auth state change
  const syncWithBackend = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken(true);
      const response = await api.post('/auth/login', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbUser(response.data.user);
    } catch (error) {
      console.error('Failed to sync with backend:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Force refresh token to get latest emailVerified claim from Firebase servers
          await firebaseUser.getIdToken(true);
          await firebaseUser.reload();
        } catch (_) {}

        const currentUser = auth.currentUser || firebaseUser;
        const isPasswordUser = currentUser.providerData?.[0]?.providerId === 'password';

        if (isPasswordUser && !currentUser.emailVerified) {
          // Sign out unverified users cleanly so Firebase SDK and React state remain in sync
          await signOut(auth);
          setUser(null);
          setDbUser(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);
        await syncWithBackend(currentUser);
      } else {
        setUser(null);
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if email is currently locked out
    checkRateLimit(cleanEmail);

    let result;
    try {
      result = await signInWithEmailAndPassword(auth, email, password);
    } catch (authError) {
      const credentialErrorCodes = [
        'auth/invalid-credential',
        'auth/wrong-password',
        'auth/user-not-found',
        'auth/invalid-email',
      ];

      if (credentialErrorCodes.includes(authError.code)) {
        recordFailedAttempt(cleanEmail);
      }
      throw authError;
    }

    // 2. Successful sign in — clear failed attempt count
    clearFailedAttempts(cleanEmail);

    // Force refresh token & user data from Firebase servers
    try {
      await result.user.getIdToken(true);
      await result.user.reload();
    } catch (_) {}

    const currentUser = auth.currentUser || result.user;

    if (!currentUser.emailVerified) {
      await signOut(auth);
      const error = new Error('Please verify your email address before logging in. Check your inbox for the link.');
      error.code = 'auth/email-not-verified';
      throw error;
    }

    setUser(currentUser);
    await syncWithBackend(currentUser);
    return currentUser;
  };

  const register = async (name, email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    
    // Automatically send verification link upon registration
    try {
      await sendEmailVerification(result.user);
    } catch (emailErr) {
      console.warn('Could not send email verification:', emailErr);
    }

    // Immediately sign out so user cannot access app without verifying email
    await signOut(auth);
    setUser(null);
    setDbUser(null);

    return { success: true, emailSent: true };
  };

  const updateUserProfile = async (newName) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newName });
      
      try {
        const token = await auth.currentUser.getIdToken(true);
        const response = await api.post('/auth/login', {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.user) {
          setDbUser(response.data.user);
        }
      } catch (_) {
        if (dbUser) setDbUser({ ...dbUser, name: newName });
      }

      setUser({ ...auth.currentUser, displayName: newName });
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await syncWithBackend(result.user);
    return result.user;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setDbUser(null);
  };

  const value = {
    user,
    dbUser,
    loading,
    login,
    register,
    updateUserProfile,
    resendVerificationEmail,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};



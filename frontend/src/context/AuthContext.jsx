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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync with backend on auth state change
  const syncWithBackend = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
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
        const isPasswordUser = firebaseUser.providerData?.[0]?.providerId === 'password';
        
        // Block unverified email/password users from backend sync & state
        if (isPasswordUser && !firebaseUser.emailVerified) {
          setUser(null);
          setDbUser(null);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        await syncWithBackend(firebaseUser);
      } else {
        setUser(null);
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Enforce email verification for email/password auth
    if (!result.user.emailVerified) {
      await signOut(auth);
      const error = new Error('Please verify your email address before logging in. Check your inbox for the link.');
      error.code = 'auth/email-not-verified';
      throw error;
    }

    await syncWithBackend(result.user);
    return result.user;
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



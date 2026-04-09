import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          setUserProfile({ id: firebaseUser.uid, ...snap.data() });
        } else {
          // New user (unknown role, likely client)
          const newProfile = {
            name: firebaseUser.displayName || 'Novi Korisnik',
            email: firebaseUser.email,
            role: 'client', // Default role
            createdAt: new Date(),
            measurements: []
          };
          // We don't auto-save to Firestore here to prevent stray accounts,
          // but we set the local state so the UI doesn't crash.
          setUserProfile({ id: firebaseUser.uid, ...newProfile });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, setUserProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

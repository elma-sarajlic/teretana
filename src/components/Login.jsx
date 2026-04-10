import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Dumbbell } from 'lucide-react';
import styles from './Login.module.css';

export default function Login() {
  const { user, setUser, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      if (userProfile.role === 'trainer') navigate('/trainer');
      else navigate('/client');
    }
  }, [user, userProfile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // --- MOCK LOGIN FOR TESTING ---
    if ((email === 'admin' && password === 'admin') || (email === 'user' && password === 'user')) {
      const isTrainer = email === 'admin';
      const mockProfile = {
        id: isTrainer ? 'mock-trainer-id' : 'mock-client-id',
        name: isTrainer ? 'Admin Trenerica' : 'Test Klijentica',
        email: email,
        role: isTrainer ? 'trainer' : 'client',
        goal: 'Testiranje',
        fitnessLevel: 'Pro'
      };
      
      setUser({ uid: mockProfile.id, email: email });
      setUserProfile(mockProfile);
      toast.success('Prijavljeni ste u DEMO modu!');
      setLoading(false);
      return;
    }
    // ----------------------------

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Dobrodošli!');
    } catch (err) {
      toast.error('Pogrešan email ili lozinka.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <div className={styles.logo}><Dumbbell size={28} /></div>
          <span>FitCoach</span>
        </div>
        <div className={styles.tagline}>
          <h1>TRENIRAJ.<br />NAPREDUJ.<br />OSVOJI.</h1>
          <p>Platforma za fitness trenerice i njihove klijentice.</p>
        </div>
        <div className={styles.dots}>
          {[...Array(12)].map((_, i) => <div key={i} className={styles.dot} />)}
        </div>
      </div>

      <div className={styles.right}>
        <form className={styles.form} onSubmit={handleLogin}>
          <h2>Prijava</h2>
          <p className={styles.sub}>Unesite vaše podatke za pristup platformi</p>
          <div className="form-group">
            <label className="label">Email adresa</label>
            <input
              type="text"
              placeholder="Email ili korisničko ime"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Lozinka</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Prijava...' : 'Prijavite se'}
          </button>

          <div className={styles.divider}>
            <span>ILI</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-lg"
            style={{ width: '100%', justifyContent: 'center', gap: '12px' }}
            onClick={async () => {
              const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
              const provider = new GoogleAuthProvider();
              try {
                await signInWithPopup(auth, provider);
                toast.success('Dobrodošli!');
              } catch (err) {
                toast.error('Prijava neuspješna.');
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.7l2.91 2.26c1.7-1.57 2.69-3.89 2.69-6.59z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.95v2.3C2.43 15.89 5.5 18 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.71c-.18-.54-.28-1.12-.28-1.71s.1-1.17.28-1.71V4.99H.95C.35 6.19 0 7.56 0 9s.35 2.81.95 4.01l3.02-2.3z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.5 0 2.43 2.11.95 5.1l3.02 2.3c.71-2.13 2.69-3.71 5.03-3.71z"/>
            </svg>
            Nastavi sa Google-om
          </button>

          <p className={styles.hint}>
            Nemate nalog? Zamolite vašu trenericu da vam kreira profil.
          </p>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Users, Calendar, Dumbbell, Library,
  LogOut, Menu, X, ChevronRight, CreditCard, Sun, Moon
} from 'lucide-react';
import styles from './TrainerLayout.module.css';

const navItems = [
  { to: '/trainer',           icon: Calendar,    label: 'Raspored',        end: true  },
  { to: '/trainer/clients',   icon: Users,       label: 'Klijentice',      end: false },
  { to: '/trainer/payments',  icon: CreditCard,  label: 'Naplate',         end: false },
  { to: '/trainer/exercises', icon: Library,     label: 'Biblioteka vježbi', end: false },
  { to: '/trainer/workouts',  icon: Dumbbell,    label: 'Treninzi',        end: false },
];

export default function TrainerLayout() {
  const { userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.sidebarInner}>
          <div className={styles.brand}>
            <div className={styles.logo}><Dumbbell size={20} /></div>
            <span>FitCoach</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav className={styles.nav}>
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
                <ChevronRight size={14} className={styles.arrow} />
              </NavLink>
            ))}
          </nav>

          {/* ── Theme Toggle ── */}
          <div className={styles.themeToggle}>
            <span className={styles.themeLabel}>
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              {theme === 'dark' ? 'Tamna tema' : 'Svijetla tema'}
            </span>
            <button
              className={styles.toggleSwitch}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              id="theme-toggle-btn"
            >
              <div className={`${styles.toggleKnob} ${theme === 'light' ? styles.toggleKnobLight : ''}`} />
            </button>
          </div>

          <div className={styles.userSection}>
            <div className={styles.avatar}>
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className={styles.avatarImg} />
              ) : (
                userProfile?.name?.[0]?.toUpperCase() || 'T'
              )}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{userProfile?.name || 'Trenerica'}</div>
              <div className={styles.userRole}>Trenerica</div>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Odjava">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <main className={styles.main}>
        <div className={styles.mobileHeader}>
          <button className={styles.menuBtn} onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <span className={styles.mobileBrand}>FitCoach</span>
          {/* Mobile theme toggle */}
          <button
            className={styles.mobileThemeBtn}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

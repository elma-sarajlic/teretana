import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Calendar, Dumbbell, Library,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import styles from './TrainerLayout.module.css';

const navItems = [
  { to: '/trainer', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trainer/clients', icon: Users, label: 'Klijentice' },
  { to: '/trainer/calendar', icon: Calendar, label: 'Kalendar' },
  { to: '/trainer/exercises', icon: Library, label: 'Biblioteka vježbi' },
  { to: '/trainer/workouts', icon: Dumbbell, label: 'Treninzi' },
];

export default function TrainerLayout({ children }) {
  const { userProfile } = useAuth();
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
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/trainer'}
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

          <div className={styles.userSection}>
            <div className={styles.avatar}>
              {userProfile?.name?.[0]?.toUpperCase() || 'T'}
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
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

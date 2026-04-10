import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase/config';
import { format } from 'date-fns';
import { Users, Calendar, CheckCircle, TrendingUp, Clock, Loader2 } from 'lucide-react';

// Pages/Components
import Login from './components/Login';
import TrainerLayout from './components/TrainerLayout';
import ClientsList from './components/ClientsList';
import ExerciseLibrary from './components/ExerciseLibrary';
import CalendarPage from './components/Calendar';
import ClientDetails from './components/ClientDetails';
import ClientDashboard from './components/ClientDashboard';
import Workouts from './components/Workouts';
import Payments from './components/Payments';

/* ── Real Trainer Dashboard ─────────────────────────── */
function TrainerDashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.id) loadStats();
  }, [userProfile]);

  const loadStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Clients
      const cq = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        where('trainerId', '==', userProfile.id)
      );
      const cSnap = await getDocs(cq);
      const clientCount = cSnap.size;

      // Appointments
      const aq = query(
        collection(db, 'appointments'),
        where('trainerId', '==', userProfile.id)
      );
      const aSnap = await getDocs(aq);
      const allAppts = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const todayList = allAppts
        .filter(a => a.date === today)
        .sort((a, b) => a.time.localeCompare(b.time));

      // Workouts this week
      const wq = query(
        collection(db, 'workouts'),
        where('trainerId', '==', userProfile.id)
      );
      const wSnap = await getDocs(wq);
      const completedThisWeek = wSnap.docs
        .map(d => d.data())
        .filter(w => {
          if (!w.completed || !w.completedAt) return false;
          const d = w.completedAt.toDate ? w.completedAt.toDate() : new Date(w.completedAt);
          const dayDiff = (new Date() - d) / (1000 * 60 * 60 * 24);
          return dayDiff <= 7;
        }).length;

      setStats({ clientCount, todayCount: todayList.length, completedThisWeek });
      setTodayAppts(todayList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="skeleton" style={{ height: '300px' }} />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobro večer';

  if (loading) return <div className="skeleton" style={{ height: '300px' }} />;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1>{greeting}, {userProfile?.name?.split(' ')[0]} 👋</h1>
        <p className="text-secondary">Evo vašeg pregleda za danas.</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{stats?.clientCount || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '4px' }}>Aktivnih klijentica</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(245,200,66,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)', flexShrink: 0 }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{stats?.todayCount || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '4px' }}>Treninga danas</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(61,214,140,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', flexShrink: 0 }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{stats?.completedThisWeek || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '4px' }}>Završenih vježbi</div>
          </div>
        </div>
      </div>

      {/* Full Calendar View */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Calendar className="text-accent" size={24} />
          <h2 style={{ fontSize: '1.5rem' }}>Vaš Kalendar</h2>
        </div>
        <CalendarPage />
      </div>
    </div>
  );
}

/* ── Protected Route ─────────────────────────────────── */
function ProtectedRoute({ children, role }) {
  const { user, userProfile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  if (role && userProfile?.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Trainer Routes */}
        <Route path="/trainer" element={
          <ProtectedRoute role="trainer">
            <TrainerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TrainerDashboard />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="exercises" element={<ExerciseLibrary />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="payments" element={<Payments />} />
          <Route path="clients/:id" element={<ClientDetails />} />
        </Route>

        {/* Client Routes */}
        <Route path="/client" element={
          <ProtectedRoute role="client">
            <ClientDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

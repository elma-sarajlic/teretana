import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
        <p className="text-secondary">Evo kako izgleda vaš dan danas.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{stats?.clientCount || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: '4px' }}>Aktivnih klijentica</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(245,200,66,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)', flexShrink: 0 }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{stats?.todayCount || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: '4px' }}>Treninga danas</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(61,214,140,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', flexShrink: 0 }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{stats?.completedThisWeek || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: '4px' }}>Završenih ove sedmice</div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1">
            <Clock size={18} className="text-accent" />
            <h3>Raspored za danas</h3>
          </div>
          <span className="badge badge-accent">{format(new Date(), 'dd.MM.yyyy.')}</span>
        </div>

        {todayAppts.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '24px 0' }}>
            Nema zakazanih treninga za danas. 🎉
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayAppts.map(appt => (
              <div key={appt.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'var(--bg3)',
                borderRadius: '10px',
                padding: '12px 16px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  minWidth: '60px',
                  textAlign: 'center'
                }}>
                  {appt.time}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{appt.clientName}</div>
                  {appt.note && <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>{appt.note}</div>}
                </div>
                {appt.duration && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{appt.duration}</div>
                )}
              </div>
            ))}
          </div>
        )}
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

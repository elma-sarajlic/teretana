import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages/Components
import Login from './components/Login';
import TrainerLayout from './components/TrainerLayout';
import ClientsList from './components/ClientsList';
import ExerciseLibrary from './components/ExerciseLibrary';
import Calendar from './components/Calendar';
import ClientDetails from './components/ClientDetails';
import ClientDashboard from './components/ClientDashboard';
import Workouts from './components/Workouts';

const TrainerDashboard = () => (
  <div className="fade-in">
    <h1>Dashboard</h1>
    <p className="text-secondary">Dobrodošli nazad u vaš fitness centar!</p>
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px', marginTop:'32px'}}>
      <div className="card"><h3>10</h3><p>Klijentica</p></div>
      <div className="card"><h3>5</h3><p>Današnjih treninga</p></div>
      <div className="card"><h3>12</h3><p>Završenih ove sedmice</p></div>
    </div>
  </div>
);


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
          <Route path="calendar" element={<Calendar />} />
          <Route path="exercises" element={<ExerciseLibrary />} />
          <Route path="workouts" element={<Workouts />} />
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

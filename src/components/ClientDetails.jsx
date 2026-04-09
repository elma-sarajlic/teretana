import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  User, Calendar, Activity, ChevronLeft, Plus, 
  Trash2, ExternalLink, Save, Weight, Ruler, History
} from 'lucide-react';
import ExerciseLibrary from './ExerciseLibrary'; // We can reuse or link
import styles from './ClientDetails.module.css';
import toast from 'react-hot-toast';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [workouts, setWorkouts] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedEx, setSelectedEx] = useState([]); // Exercises for new plan

  useEffect(() => {
    loadClient();
    loadWorkouts();
  }, [id]);

  const loadClient = async () => {
    const snap = await getDoc(doc(db, 'users', id));
    if (snap.exists()) {
      setClient({ id: snap.id, ...snap.data() });
    }
    setLoading(false);
  };

  const loadWorkouts = async () => {
    const q = query(collection(db, 'workouts'), where('clientId', '==', id), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const addNote = async (note) => {
    await updateDoc(doc(db, 'users', id), { notes: note });
    setClient(prev => ({ ...prev, notes: note }));
    toast.success('Napomena spremljena');
  };

  if (loading) return <div className="skeleton" style={{ height: '400px' }} />;
  if (!client) return <div>Klijentica nije pronađena.</div>;

  const lastMeasurement = client.measurements?.[client.measurements.length - 1] || {};

  return (
    <div className="fade-in">
      <div className={styles.topBar}>
        <button className="btn btn-ghost" onClick={() => navigate('/trainer/clients')}>
          <ChevronLeft size={18} /> Povratak
        </button>
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={() => {
            const msg = window.encodeURIComponent(`Zdravo ${client.name}, tvoj plan treninga je spreman! Pogledaj na: ${window.location.origin}`);
            window.open(`viber://forward?text=${msg}`);
            toast.success('Viber otvoren!');
          }}>
            <ExternalLink size={16} /> Javi na Viber
          </button>
          <button className="btn btn-primary" onClick={() => setShowPlanModal(true)}>
            <Plus size={16} /> Novi plan treninga
          </button>
        </div>
      </div>

      <div className={styles.header}>
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>
            {client.photoURL ? <img src={client.photoURL} alt={client.name} /> : client.name[0]}
          </div>
          <div>
            <h1>{client.name}</h1>
            <p className="text-secondary">{client.email}</p>
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <Weight size={18} className="text-accent" />
            <div>
              <span className={styles.statVal}>{lastMeasurement.weight || '--'} kg</span>
              <span className={styles.statLabel}>Težina</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Ruler size={18} className="text-accent" />
            <div>
              <span className={styles.statVal}>{lastMeasurement.height || '--'} cm</span>
              <span className={styles.statLabel}>Visina</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <Activity size={18} className="text-accent" />
            <div>
              <span className={styles.statVal}>{workouts.length}</span>
              <span className={styles.statLabel}>Treninga</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={activeTab === 'overview' ? styles.activeTab : ''} onClick={() => setActiveTab('overview')}>Pregled</button>
        <button className={activeTab === 'history' ? styles.activeTab : ''} onClick={() => setActiveTab('history')}>Historija Treninga</button>
        <button className={activeTab === 'notes' ? styles.activeTab : ''} onClick={() => setActiveTab('notes')}>Napomene</button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            <div className="card">
              <h3>Zadnji Trening</h3>
              {workouts.length > 0 ? (
                <div className={styles.workoutItem}>
                  <div className={styles.workoutDate}>{workouts[0].createdAt.toDate().toLocaleDateString('hr')}</div>
                  <h4>{workouts[0].title}</h4>
                  <p>{workouts[0].exercises?.length} vježbi</p>
                </div>
              ) : <p className="text-secondary">Nema podataka.</p>}
            </div>
            <div className="card">
              <h3>Napredak (Cilj)</h3>
              <p className="text-secondary">Prikaz grafikona će biti dostupan uskoro.</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className={styles.historyList}>
            {workouts.map(w => (
              <div key={w.id} className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <span className={styles.historyDate}>{w.date || w.createdAt.toDate().toLocaleDateString('hr')}</span>
                  {w.completed ? <span className="badge badge-green">Odrađeno</span> : <span className="badge badge-yellow">U planu</span>}
                </div>
                <h4>{w.title}</h4>
                <div className={styles.exList}>
                  {w.exercises?.map((ex, i) => (
                    <span key={i} className={styles.exTag}>{ex.name}</span>
                  )) || 'Bez vježbi'}
                </div>
                {w.feedback && (
                  <div className={styles.feedback}>
                    <p><strong>Feedback:</strong> {w.feedback}</p>
                    <p><strong>Težina:</strong> {w.difficulty}/5, <strong>Zadovoljstvo:</strong> {w.satisfaction}/5</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="card">
            <h3>Privatne Napomene</h3>
            <p className="text-secondary mb-2">Ove napomene vidi samo trenerica.</p>
            <textarea 
              className={styles.notesArea} 
              defaultValue={client.notes} 
              onBlur={(e) => addNote(e.target.value)} 
              placeholder="Upišite napomene o klijentici (povrede, ciljevi, preferencije...)"
            />
          </div>
        )}
      </div>

      {/* Plan Creator Placeholder */}
      {showPlanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPlanModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Novi Plan Treninga</h2>
            <p className="text-secondary">Kreirajte plan koji će klijentica vidjeti na svom profilu.</p>
            {/* Simple integration for now */}
            <div className="form-group">
              <label className="label">Naslov treninga</label>
              <input placeholder="npr. Trening Donjeg Dijela - A" id="planTitle" />
            </div>
            <p className="text-secondary">Odabrali ste vježbe iz biblioteke...</p>
            <button className="btn btn-primary" style={{width:'100%'}} onClick={() => {
              toast.success('Funkcija u pripremi. Iskoristite "Treninzi" tab za masovno dodavanje.');
              setShowPlanModal(false);
            }}>Dodaj Plan</button>
          </div>
        </div>
      )}
    </div>
  );
}

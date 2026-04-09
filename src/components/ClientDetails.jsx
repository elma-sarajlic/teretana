import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  User, Calendar, Activity, ChevronLeft, Plus, 
  Trash2, ExternalLink, Save, Weight, Ruler, History, Settings
} from 'lucide-react';
import ExerciseLibrary from './ExerciseLibrary'; // We can reuse or link
import styles from './ClientDetails.module.css';
import toast from 'react-hot-toast';

const calculateBMI = (w, h) => {
  if (!w || !h) return '--';
  const bmi = (w / ((h / 100) * (h / 100))).toFixed(1);
  return bmi;
};

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
    try {
      const snap = await getDoc(doc(db, 'users', id));
      if (snap.exists()) {
        setClient({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error(err);
      toast.error('Greška pri učitavanju klijentice.');
    } finally {
      setLoading(false);
    }
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
        <button className={activeTab === 'karton' ? styles.activeTab : ''} onClick={() => setActiveTab('karton')}>Karton Klijentice</button>
        <button className={activeTab === 'history' ? styles.activeTab : ''} onClick={() => setActiveTab('history')}>Historija Treninga</button>
        <button className={activeTab === 'notes' ? styles.activeTab : ''} onClick={() => setActiveTab('notes')}>Napomene</button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            <div className="card">
              <div className="flex items-center gap-1 mb-2">
                <History size={18} className="text-accent" />
                <h3>Zadnji Trening</h3>
              </div>
              {workouts.length > 0 ? (
                <div className={styles.workoutItem}>
                  <div className={styles.workoutDate}>{workouts[0].createdAt.toDate().toLocaleDateString('hr')}</div>
                  <h4>{workouts[0].title}</h4>
                  <p className="text-secondary">{workouts[0].exercises?.length} vježbi planirano</p>
                  {workouts[0].completed && <div className="badge badge-green mt-1">Završeno</div>}
                </div>
              ) : <p className="text-secondary">Još nema dodijeljenih treninga.</p>}
            </div>
            
            <div className="card">
              <div className="flex items-center gap-1 mb-2">
                <Activity size={18} className="text-accent" />
                <h3>Status Cilja</h3>
              </div>
              <div className={styles.goalStatus}>
                <div className={styles.goalInfo}>
                  <strong>Cilj:</strong> {client.goal || 'Nije postavljen'}
                </div>
                <div className={styles.progressContainer}>
                  <div className={styles.progressLabel}>
                    <span>Napredak</span>
                    <span>{client.progressPercent || 0}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{width: `${client.progressPercent || 0}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'karton' && (
          <div className={styles.kartonGrid}>
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3>Lični Podaci</h3>
                <button className="btn btn-ghost btn-sm"><Settings size={14} /></button>
              </div>
              <div className={styles.dataList}>
                <div className={styles.dataItem}>
                  <span>Dob / Godine</span>
                  <strong>{client.age || '--'} god.</strong>
                </div>
                <div className={styles.dataItem}>
                  <span>Nivo forme</span>
                  <span className="badge badge-accent">{client.fitnessLevel || 'Nije određeno'}</span>
                </div>
                <div className={styles.dataItem}>
                  <span>Zanimanje</span>
                  <strong>{client.job || 'Nije uneseno'}</strong>
                </div>
                <div className={styles.dataItem}>
                  <span>Broj telefona</span>
                  <a href={`tel:${client.phone}`} className="text-accent"><strong>{client.phone || '--'}</strong></a>
                </div>
              </div>
              <div className={styles.healthAlert}>
                <label className="label">Povrede / Zdravstvene napomene</label>
                <div className={styles.healthBox}>
                  {client.injuries || 'Nema prijavljenih povreda.'}
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Detaljne Mjere</h3>
              <div className={styles.measuresGrid}>
                <div className={styles.measureBox}>
                  <span>Struk</span>
                  <strong>{lastMeasurement.waist || '--'} cm</strong>
                </div>
                <div className={styles.measureBox}>
                  <span>Bokovi</span>
                  <strong>{lastMeasurement.hips || '--'} cm</strong>
                </div>
                <div className={styles.measureBox}>
                  <span>Grudi</span>
                  <strong>{lastMeasurement.chest || '--'} cm</strong>
                </div>
                <div className={styles.measureBox}>
                  <span>Bedro</span>
                  <strong>{lastMeasurement.thigh || '--'} cm</strong>
                </div>
              </div>
              <div className={styles.bmiInfo}>
                <div className={styles.bmiValue}>
                  <span>BMI</span>
                  <strong>{calculateBMI(lastMeasurement.weight, lastMeasurement.height)}</strong>
                </div>
                <p className="text-secondary" style={{fontSize: '0.75rem'}}>Indeks tjelesne mase se računa automatski.</p>
              </div>
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

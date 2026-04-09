import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { 
  Dumbbell, CheckCircle, Clock, TrendingUp, 
  Camera, Settings, LogOut, ChevronRight, Star, Plus
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import styles from './ClientDashboard.module.css';
import toast from 'react-hot-toast';

export default function ClientDashboard() {
  const { userProfile, setUserProfile } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progress, setProgress] = useState({ weight: '', height: '' });

  useEffect(() => {
    if (userProfile?.id) {
      loadWorkouts();
      setProgress({
        weight: userProfile.measurements?.[userProfile.measurements.length - 1]?.weight || '',
        height: userProfile.measurements?.[userProfile.measurements.length - 1]?.height || ''
      });
    }
  }, [userProfile]);

  const loadWorkouts = async () => {
    const q = query(
      collection(db, 'workouts'), 
      where('clientId', '==', userProfile.id),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const snap = await getDocs(q);
    setWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleComplete = async (workoutId, feedback, difficulty, satisfaction) => {
    try {
      await updateDoc(doc(db, 'workouts', workoutId), {
        completed: true,
        completedAt: new Date(),
        feedback,
        difficulty,
        satisfaction
      });
      toast.success('Trening završen! Bravo!');
      setSelectedWorkout(null);
      loadWorkouts();
    } catch (err) {
      toast.error('Greška pri spremanju.');
    }
  };

  const updateMeasurements = async (e) => {
    e.preventDefault();
    const newMeasure = {
      weight: parseFloat(progress.weight),
      height: parseFloat(progress.height),
      date: new Date()
    };
    const updatedMeasurements = [...(userProfile.measurements || []), newMeasure];
    await updateDoc(doc(db, 'users', userProfile.id), { measurements: updatedMeasurements });
    setUserProfile({ ...userProfile, measurements: updatedMeasurements });
    toast.success('Podaci ažurirani!');
    setShowProgressModal(false);
  };

  const logout = () => signOut(auth);

  if (loading) return <div className="skeleton" style={{height:'100vh'}} />;

  const nextWorkout = workouts.find(w => !w.completed);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Dumbbell className="text-accent" />
          <span>FitCoach</span>
        </div>
        <button className={styles.logoutBtn} onClick={logout}><LogOut size={18} /></button>
      </header>

      <main className={styles.main}>
        <section className={styles.welcome}>
          <div className="flex justify-between items-center">
            <div>
              <h1>Zdravo, {userProfile.name?.split(' ')[0]}! 👋</h1>
              <p>Vaš cilj: <span className="text-accent">{userProfile.goal || 'Budi dosljedna!'}</span></p>
            </div>
            <div className={styles.progressCircle}>
              <div className={styles.circleText}>
                <span>{userProfile.progressPercent || 0}%</span>
                <small>Cilj</small>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.statsGrid}>
          <div className={styles.statCard} onClick={() => setShowProgressModal(true)}>
            <div className={styles.statIcon}><TrendingUp size={20} /></div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{progress.weight || '--'} kg</span>
              <span className={styles.statLabel}>Zadnja težina</span>
            </div>
            <ChevronRight size={16} className={styles.statArrow} />
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><Star size={20} /></div>
            <div className={styles.statContent}>
              <span className={styles.statVal}>{userProfile.fitnessLevel || 'Početnik'}</span>
              <span className={styles.statLabel}>Nivo forme</span>
            </div>
          </div>
        </section>

        <section className={styles.measuresSection}>
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <h3>Moje Mjere</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowProgressModal(true)}><Plus size={14} /></button>
            </div>
            <div className={styles.measuresList}>
              <div className={styles.measureItem}>
                <span>Struk</span>
                <strong>{userProfile.measurements?.[userProfile.measurements.length-1]?.waist || '--'} cm</strong>
              </div>
              <div className={styles.measureItem}>
                <span>Bokovi</span>
                <strong>{userProfile.measurements?.[userProfile.measurements.length-1]?.hips || '--'} cm</strong>
              </div>
              <div className={styles.measureItem}>
                <span>BMI</span>
                <strong>{(userProfile.measurements?.[userProfile.measurements.length-1]?.weight / ((userProfile.measurements?.[userProfile.measurements.length-1]?.height/100)**2))?.toFixed(1) || '--'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.workoutSection}>
          <div className={styles.sectionHeader}>
            <h3>Moji Treninzi</h3>
          </div>

          {nextWorkout && (
            <div className={styles.primeCard} onClick={() => setSelectedWorkout(nextWorkout)}>
              <div className={styles.primeBadge}>SLJEDEĆI TRENING</div>
              <h2>{nextWorkout.title}</h2>
              <p>{nextWorkout.exercises?.length || 0} vježbi • Približno 45 min</p>
              <button className="btn btn-primary" style={{marginTop:'16px'}}>Započni Trening</button>
            </div>
          )}

          <div className={styles.historyList}>
            {workouts.map(w => (
              <div key={w.id} className={`${styles.historyItem} ${w.completed ? styles.completed : ''}`} onClick={() => setSelectedWorkout(w)}>
                <div className={styles.historyIcon}>
                  {w.completed ? <CheckCircle size={18} className="text-green" /> : <Clock size={18} className="text-yellow" />}
                </div>
                <div className={styles.historyInfo}>
                  <h4>{w.title}</h4>
                  <span>{w.exercises?.length || 0} vježbi</span>
                </div>
                <ChevronRight size={16} className={styles.arrow} />
              </div>
            ))}
            {workouts.length === 0 && <p className={styles.empty}>Vaša trenerica još nije dodala treninge.</p>}
          </div>
        </section>
      </main>

      {/* Workout Detail Modal */}
      {selectedWorkout && (
        <div className={styles.modalOverlay} onClick={() => setSelectedWorkout(null)}>
          <div className={styles.workoutModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{selectedWorkout.title}</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedWorkout(null)}>&times;</button>
            </div>
            
            <div className={styles.exerciseList}>
              {selectedWorkout.exercises?.map((ex, i) => (
                <div key={i} className={styles.exCard}>
                  {ex.videoUrl && <video src={ex.videoUrl} muted loop autoPlay playsInline className={styles.exVideo} />}
                  <div className={styles.exInfo}>
                    <h4>{i + 1}. {ex.name}</h4>
                    <p>{ex.description}</p>
                    {ex.sets && <div className={styles.sets}>{ex.sets} serije &bull; {ex.reps} ponavljanja</div>}
                  </div>
                </div>
              ))}
            </div>

            {!selectedWorkout.completed && (
              <div className={styles.completionForm}>
                <h3>Završi trening</h3>
                <div className="form-group">
                  <label className="label">Kako si se osjećala nakon treninga?</label>
                  <textarea id="feedback" placeholder="npr. Super trening, malo su me noge boljele..." rows="2" />
                </div>
                <div className={styles.ratingRow}>
                  <div>
                    <label className="label">Težina (1-5)</label>
                    <input type="number" id="difficulty" min="1" max="5" defaultValue="3" />
                  </div>
                  <div>
                    <label className="label">Zadovoljstvo (1-5)</label>
                    <input type="number" id="satisfaction" min="1" max="5" defaultValue="5" />
                  </div>
                </div>
                <button className="btn btn-primary" style={{width:'100%'}} onClick={() => {
                  const f = document.getElementById('feedback').value;
                  const d = document.getElementById('difficulty').value;
                  const s = document.getElementById('satisfaction').value;
                  handleComplete(selectedWorkout.id, f, d, s);
                }}>Potvrdi i završi</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className={styles.modalOverlay} onClick={() => setShowProgressModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Moje Mjere</h2>
            <form onSubmit={updateMeasurements}>
              <div className="form-group">
                <label className="label">Težina (kg)</label>
                <input type="number" step="0.1" value={progress.weight} onChange={e => setProgress({...progress, weight: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="label">Visina (cm)</label>
                <input type="number" step="0.1" value={progress.height} onChange={e => setProgress({...progress, height: e.target.value})} required />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProgressModal(false)}>Odustani</button>
                <button type="submit" className="btn btn-primary">Spremi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

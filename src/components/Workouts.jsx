import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { defaultExercises } from '../data/defaultExercises';
import { Plus, Trash2, Send, Activity, User, BookOpen } from 'lucide-react';
import styles from './Workouts.module.css';
import toast from 'react-hot-toast';

export default function Workouts() {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load clients
      const qClients = query(collection(db, 'users'), where('trainerId', '==', userProfile.id), where('role', '==', 'client'));
      const snapClients = await getDocs(qClients);
      setClients(snapClients.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load exercises from DB or use defaults
      const qEx = query(collection(db, 'exercises'), orderBy('name'));
      const snapEx = await getDocs(qEx);
      const dbEx = snapEx.docs.map(d => ({ id: d.id, ...d.data() }));
      setExercises(dbEx.length > 0 ? dbEx : defaultExercises);
    } catch (err) {
      setExercises(defaultExercises);
    } finally {
      setLoading(false);
    }
  };

  const addExerciseToPlan = (ex) => {
    setAddedExercises([...addedExercises, { ...ex, sets: 3, reps: 12, planId: Date.now() }]);
    toast.success(`${ex.name} dodan u plan`);
  };

  const removeExercise = (planId) => {
    setAddedExercises(addedExercises.filter(e => e.planId !== planId));
  };

  const updateExDetails = (planId, field, value) => {
    setAddedExercises(addedExercises.map(e => 
      e.planId === planId ? { ...e, [field]: value } : e
    ));
  };

  const saveWorkout = async (e) => {
    e.preventDefault();
    if (!selectedClientId) return toast.error('Odaberite klijenticu');
    if (addedExercises.length === 0) return toast.error('Dodajte bar jednu vježbu');

    try {
      const workoutData = {
        trainerId: userProfile.id,
        clientId: selectedClientId,
        title: workoutTitle || 'Trening snage',
        exercises: addedExercises.map(({ name, description, videoUrl, imageUrl, sets, reps }) => ({
          name, description, videoUrl, imageUrl, sets, reps
        })),
        completed: false,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'workouts'), workoutData);
      toast.success('Trening uspješno dodijeljen!');
      
      // Reset
      setWorkoutTitle('');
      setAddedExercises([]);
      setSelectedClientId('');
    } catch (err) {
      toast.error('Greška pri spremanju.');
    }
  };

  if (loading) return <div className="skeleton" style={{height:'300px'}} />;

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>KREATOR TRENINGA</h1>
        <p className="text-secondary">Sastavite plan i pošaljite ga direktno klijenticama</p>
      </div>

      <div className={styles.container}>
        {/* Step 1: Client & Title */}
        <div className={styles.configArea}>
          <div className="card">
            <h3>1. Osnovne informacije</h3>
            <div className="form-group mt-2">
              <label className="label">Klijentica</label>
              <select 
                value={selectedClientId} 
                onChange={e => setSelectedClientId(e.target.value)}
                required
              >
                <option value="">Odaberi klijenticu...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Naslov treninga</label>
              <input 
                placeholder="npr. Full Body - Dan A" 
                value={workoutTitle}
                onChange={e => setWorkoutTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="card mt-2">
            <div className="flex justify-between items-center mb-2">
              <h3>2. Plan vježbi</h3>
              <span className="badge badge-accent">{addedExercises.length} vježbi</span>
            </div>
            
            <div className={styles.planList}>
              {addedExercises.length === 0 && (
                <div className={styles.emptyPlan}>
                  <BookOpen size={24} />
                  <p>Dodajte vježbe iz biblioteke desno</p>
                </div>
              )}
              {addedExercises.map((ex) => (
                <div key={ex.planId} className={styles.planItem}>
                  <div className={styles.planItemInfo}>
                    <strong>{ex.name}</strong>
                    <div className={styles.inputs}>
                      <input 
                        type="number" 
                        value={ex.sets} 
                        onChange={e => updateExDetails(ex.planId, 'sets', e.target.value)}
                        title="Serije"
                      />
                      <span>serije</span>
                      <input 
                        type="text" 
                        value={ex.reps} 
                        onChange={e => updateExDetails(ex.planId, 'reps', e.target.value)}
                        title="Ponavljanja"
                      />
                      <span>pon.</span>
                    </div>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeExercise(ex.planId)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button 
              className="btn btn-primary mt-2" 
              style={{width: '100%', justifyContent: 'center'}}
              onClick={saveWorkout}
              disabled={addedExercises.length === 0}
            >
              <Send size={16} /> Pošalji klijentici
            </button>
          </div>
        </div>

        {/* Step 2: Library Selection */}
        <div className={styles.libraryArea}>
          <div className="card">
            <h3>3. Biblioteka vježbi</h3>
            <div className={styles.libraryGrid}>
              {exercises.map(ex => (
                <div key={ex.id} className={styles.libCard}>
                  <img src={ex.imageUrl} alt={ex.name} />
                  <div className={styles.libCardOver}>
                    <strong>{ex.name}</strong>
                    <button className="btn btn-primary btn-sm" onClick={() => addExerciseToPlan(ex)}>
                      <Plus size={14} /> Dodaj
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

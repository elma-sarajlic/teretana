import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { defaultExercises } from '../data/defaultExercises';
import { Plus, Trash2, Send, Activity, User, BookOpen, Save, Copy, ChevronDown, ChevronUp, X, Edit, Loader2 } from 'lucide-react';
import styles from './Workouts.module.css';
import toast from 'react-hot-toast';

export default function Workouts() {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Selection State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);

  useEffect(() => {
    if (userProfile?.id) loadData();
  }, [userProfile]);

  const loadData = async () => {
    try {
      // Load clients
      const qClients = query(collection(db, 'users'), where('trainerId', '==', userProfile.id), where('role', '==', 'client'));
      const snapClients = await getDocs(qClients);
      setClients(snapClients.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load exercises
      const qEx = query(collection(db, 'exercises'), orderBy('name'));
      const snapEx = await getDocs(qEx);
      const dbEx = snapEx.docs.map(d => ({ id: d.id, ...d.data() }));
      setExercises([...defaultExercises, ...dbEx]);

      // Load templates
      const qTpl = query(collection(db, 'workout_templates'), where('trainerId', '==', userProfile.id), orderBy('createdAt', 'desc'));
      const snapTpl = await getDocs(qTpl);
      setTemplates(snapTpl.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setExercises(defaultExercises);
    } finally {
      setLoading(false);
    }
  };

  const addExerciseToPlan = (ex) => {
    setAddedExercises([...addedExercises, { ...ex, sets: 3, reps: '12', planId: Date.now() + Math.random() }]);
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
      
      setWorkoutTitle('');
      setAddedExercises([]);
      setSelectedClientId('');
    } catch (err) {
      toast.error('Greška pri spremanju.');
    }
  };

  /* ── Template Logic ── */
  const saveAsTemplate = async () => {
    if (!workoutTitle.trim()) return toast.error('Unesite naslov treninga da biste ga spremili kao šablon');
    if (addedExercises.length === 0) return toast.error('Dodajte vježbe u plan');
    
    setSavingTemplate(true);
    try {
      const templateData = {
        trainerId: userProfile.id,
        title: workoutTitle,
        exercises: addedExercises.map(({ name, description, videoUrl, imageUrl, sets, reps }) => ({
          name, description, videoUrl, imageUrl, sets, reps
        })),
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'workout_templates'), templateData);
      toast.success('Šablon spremljen!');
      
      // Update local templates
      loadData();
    } catch (err) {
      toast.error('Greška pri spremanju šablona');
    } finally {
      setSavingTemplate(false);
    }
  };

  const applyTemplate = (tpl) => {
    setWorkoutTitle(tpl.title);
    setAddedExercises(tpl.exercises.map(ex => ({ ...ex, planId: Date.now() + Math.random() })));
    setShowTemplates(false);
    toast.success(`Šablon "${tpl.title}" primijenjen!`);
  };

  const deleteTemplate = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Jeste li sigurni da želite obrisati ovaj šablon?')) return;
    try {
      await deleteDoc(doc(db, 'workout_templates', id));
      toast.success('Šablon obrisan');
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      toast.error('Greška pri brisanju');
    }
  };

  if (loading) return <div className="skeleton" style={{height:'400px'}} />;

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1>KREATOR TRENINGA</h1>
          <p className="text-secondary">Sastavite plan ili koristite šablone za brži rad</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowTemplates(!showTemplates)}>
          <Copy size={18} /> {showTemplates ? 'Zatvori šablone' : 'Moji Šabloni'}
        </button>
      </div>

      {showTemplates && (
        <div className={styles.templatesPanel + " fade-in"}>
          <h3>Vaši spremljeni šabloni</h3>
          {templates.length === 0 ? (
            <p className="text-secondary mt-1">Još nemate spremljenih šablona.</p>
          ) : (
            <div className={styles.templateGrid}>
              {templates.map(tpl => (
                <div key={tpl.id} className={styles.templateCard} onClick={() => applyTemplate(tpl)}>
                  <div className={styles.templateInfo}>
                    <h4>{tpl.title}</h4>
                    <span>{tpl.exercises?.length || 0} vježbi</span>
                  </div>
                  <button className={styles.deleteTplBtn} onClick={(e) => deleteTemplate(e, tpl.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.container}>
        {/* Step 1: Config */}
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
              <div className="flex gap-1">
                <input 
                  placeholder="npr. Full Body - Dan A" 
                  value={workoutTitle}
                  onChange={e => setWorkoutTitle(e.target.value)}
                  style={{flex: 1}}
                />
              </div>
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
                  <p>Dodajte vježbe iz biblioteke desno ili učitajte šablon</p>
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
                      <span>serija ×</span>
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

            <div className={styles.actionButtons}>
              <button 
                className="btn btn-secondary" 
                onClick={saveAsTemplate}
                disabled={addedExercises.length === 0 || savingTemplate}
              >
                {savingTemplate ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                Spremi kao šablon
              </button>
              <button 
                className="btn btn-primary" 
                onClick={saveWorkout}
                disabled={addedExercises.length === 0}
              >
                <Send size={16} /> Pošalji klijentici
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Library */}
        <div className={styles.libraryArea}>
          <div className="card">
            <h3>3. Biblioteka vježbi</h3>
            <div className={styles.libraryGrid}>
              {exercises.map(ex => (
                <div key={ex.id} className={styles.libCard} onClick={() => addExerciseToPlan(ex)}>
                  <img src={ex.imageUrl} alt={ex.name} />
                  <div className={styles.libCardOver}>
                    <strong>{ex.name}</strong>
                    <div className={styles.addIcon}><Plus size={16} /></div>
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

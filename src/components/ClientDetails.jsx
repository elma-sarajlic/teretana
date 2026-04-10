import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { defaultExercises } from '../data/defaultExercises';
import {
  User, Calendar, Activity, ChevronLeft, Plus,
  Trash2, ExternalLink, Save, Weight, Ruler, History, Settings,
  Search, Send, BookOpen, X, Loader2
} from 'lucide-react';
import styles from './ClientDetails.module.css';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const calculateBMI = (w, h) => {
  if (!w || !h) return '--';
  return (w / ((h / 100) * (h / 100))).toFixed(1);
};

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [workouts, setWorkouts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Plan builder state
  const [allExercises, setAllExercises] = useState([]);
  const [planTitle, setPlanTitle] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);
  const [exSearch, setExSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClient();
    loadWorkouts();
    loadExercises();
    loadTemplates();
  }, [id]);

  const loadClient = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', id));
      if (snap.exists()) setClient({ id: snap.id, ...snap.data() });
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

  const loadExercises = async () => {
    try {
      const q = query(collection(db, 'exercises'), orderBy('name'));
      const snap = await getDocs(q);
      const dbEx = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllExercises([...defaultExercises, ...dbEx]);
    } catch {
      setAllExercises(defaultExercises);
    }
  };

  const loadTemplates = async () => {
    if (!client?.trainerId) return;
    try {
      const q = query(collection(db, 'workout_templates'), where('trainerId', '==', client.trainerId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Template loading error:', err);
    }
  };

  const addNote = async (note) => {
    await updateDoc(doc(db, 'users', id), { notes: note });
    setClient(prev => ({ ...prev, notes: note }));
    toast.success('Napomena spremljena');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Slika je prevelika. Maksimalno 2MB.'); return; }
    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${id}/profile_${Date.now()}`);
      const result = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(result.ref);
      await updateDoc(doc(db, 'users', id), { photoURL: url });
      setClient(prev => ({ ...prev, photoURL: url }));
      toast.success('Profilna slika ažurirana!');
    } catch (err) {
      toast.error(`Greška: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  /* ── Plan builder helpers ── */
  const addToPlan = (ex) => {
    if (addedExercises.find(e => e.id === ex.id)) {
      toast.error('Vježba je već u planu');
      return;
    }
    setAddedExercises(prev => [...prev, { ...ex, sets: 3, reps: '12', planId: Date.now() }]);
  };

  const removeFromPlan = (planId) => setAddedExercises(prev => prev.filter(e => e.planId !== planId));

  const updateExField = (planId, field, value) =>
    setAddedExercises(prev => prev.map(e => e.planId === planId ? { ...e, [field]: value } : e));

  const applyTemplate = (tpl) => {
    setPlanTitle(tpl.title);
    setAddedExercises(tpl.exercises.map(ex => ({ ...ex, planId: Date.now() + Math.random() })));
    setShowTemplates(false);
    toast.success('Šablon primijenjen!');
  };

  const submitPlan = async () => {
    if (!planTitle.trim()) { toast.error('Unesite naslov treninga'); return; }
    if (addedExercises.length === 0) { toast.error('Dodajte bar jednu vježbu'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'workouts'), {
        trainerId: client.trainerId,
        clientId: id,
        title: planTitle,
        exercises: addedExercises.map(({ name, description, videoUrl, imageUrl, sets, reps }) =>
          ({ name, description, videoUrl, imageUrl, sets, reps })
        ),
        completed: false,
        createdAt: new Date(),
      });
      toast.success('Plan treninga uspješno dodijeljen!');
      setShowPlanModal(false);
      setPlanTitle('');
      setAddedExercises([]);
      setExSearch('');
      loadWorkouts();
    } catch (err) {
      toast.error('Greška pri spremanju: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredEx = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exSearch.toLowerCase()) ||
    ex.category.toLowerCase().includes(exSearch.toLowerCase())
  );

  /* ── Viber message with real info ── */
  const sendViber = () => {
    const nextWorkout = workouts.find(w => !w.completed);
    let msg = `Zdravo ${client.name}! `;
    if (nextWorkout) {
      msg += `Tvoj novi plan treninga je spreman: "${nextWorkout.title}" (${nextWorkout.exercises?.length || 0} vježbi). Pogledaj na: ${window.location.origin}/client`;
    } else {
      msg += `Pogledaj svoju aplikaciju za najnoviji plan treninga: ${window.location.origin}/client`;
    }
    window.open(`viber://forward?text=${encodeURIComponent(msg)}`);
    toast.success('Viber otvoren!');
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
          <button className="btn btn-secondary" onClick={sendViber}>
            <ExternalLink size={16} /> Javi na Viber
          </button>
          <button className="btn btn-primary" onClick={() => setShowPlanModal(true)}>
            <Plus size={16} /> Novi plan treninga
          </button>
        </div>
      </div>

      <div className={styles.header}>
        <div className={styles.profileInfo}>
          <div className={styles.avatarWrapper} onClick={() => document.getElementById('clientPhotoUpload').click()}>
            <div className={styles.avatar}>
              {client.photoURL ? (
                <img src={client.photoURL} alt={client.name} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              ) : null}
              <span style={{ display: client.photoURL ? 'none' : 'flex' }}>{client.name[0]}</span>
              {uploading && <div className={styles.avatarOverlay}><Loader2 className="spin" size={24} /></div>}
            </div>
            <input type="file" id="clientPhotoUpload" hidden accept="image/*" onChange={handleImageUpload} />
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
                    <div className={styles.progressFill} style={{ width: `${client.progressPercent || 0}%` }} />
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
                <div className={styles.dataItem}><span>Dob / Godine</span><strong>{client.age || '--'} god.</strong></div>
                <div className={styles.dataItem}><span>Nivo forme</span><span className="badge badge-accent">{client.fitnessLevel || 'Nije određeno'}</span></div>
                <div className={styles.dataItem}><span>Zanimanje</span><strong>{client.job || 'Nije uneseno'}</strong></div>
                <div className={styles.dataItem}><span>Broj telefona</span><a href={`tel:${client.phone}`} className="text-accent"><strong>{client.phone || '--'}</strong></a></div>
              </div>
              <div className={styles.healthAlert}>
                <label className="label">Povrede / Zdravstvene napomene</label>
                <div className={styles.healthBox}>{client.injuries || 'Nema prijavljenih povreda.'}</div>
              </div>
            </div>

            <div className="card">
              <h3>Detaljne Mjere</h3>
              <div className={styles.measuresGrid}>
                <div className={styles.measureBox}><span>Struk</span><strong>{lastMeasurement.waist || '--'} cm</strong></div>
                <div className={styles.measureBox}><span>Bokovi</span><strong>{lastMeasurement.hips || '--'} cm</strong></div>
                <div className={styles.measureBox}><span>Grudi</span><strong>{lastMeasurement.chest || '--'} cm</strong></div>
                <div className={styles.measureBox}><span>Bedro</span><strong>{lastMeasurement.thigh || '--'} cm</strong></div>
              </div>
              <div className={styles.bmiInfo}>
                <div className={styles.bmiValue}><span>BMI</span><strong>{calculateBMI(lastMeasurement.weight, lastMeasurement.height)}</strong></div>
                <p className="text-secondary" style={{ fontSize: '0.75rem' }}>Indeks tjelesne mase se računa automatski.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className={styles.historyList}>
            {workouts.length === 0 && <p className="text-secondary">Još nema treninga.</p>}
            {workouts.map(w => (
              <div key={w.id} className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <span className={styles.historyDate}>{w.date || w.createdAt.toDate().toLocaleDateString('hr')}</span>
                  {w.completed ? <span className="badge badge-green">Odrađeno</span> : <span className="badge badge-yellow">U planu</span>}
                </div>
                <h4>{w.title}</h4>
                <div className={styles.exList}>
                  {w.exercises?.map((ex, i) => <span key={i} className={styles.exTag}>{ex.name}</span>) || 'Bez vježbi'}
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

      {/* ── Workout Plan Builder Modal ── */}
      {showPlanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPlanModal(false)}>
          <div className={styles.planModal} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.planModalHeader}>
              <div>
                <h2>Novi Plan Treninga</h2>
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>za {client.name}</p>
              </div>
              <div className="flex gap-1">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplates(!showTemplates)}>
                  {showTemplates ? 'Zatvori šablone' : 'Učitaj šablon'}
                </button>
                <button className={styles.planCloseBtn} onClick={() => setShowPlanModal(false)}><X size={18} /></button>
              </div>
            </div>

            {showTemplates && (
              <div className={styles.templatesListOverlay}>
                <div className={styles.templatesHeader}>
                  <h4>Odaberite šablon</h4>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowTemplates(false)}>Zatvori</button>
                </div>
                {templates.length === 0 ? (
                  <p className="text-secondary p-2 text-center">Nema spremljenih šablona.</p>
                ) : (
                  <div className={styles.tplGrid}>
                    {templates.map(tpl => (
                      <div key={tpl.id} className={styles.tplCard} onClick={() => applyTemplate(tpl)}>
                        <strong>{tpl.title}</strong>
                        <span>{tpl.exercises?.length} vježbi</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.planLayout}>
              {/* Left: Title + Plan list */}
              <div className={styles.planLeft}>
                <div className="form-group">
                  <label className="label">Naslov treninga</label>
                  <input
                    placeholder="npr. Full Body – Dan A"
                    value={planTitle}
                    onChange={e => setPlanTitle(e.target.value)}
                  />
                </div>

                <div className={styles.planItems}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4>Plan vježbi</h4>
                    <span className="badge badge-accent">{addedExercises.length} vježbi</span>
                  </div>

                  {addedExercises.length === 0 ? (
                    <div className={styles.emptyPlan}>
                      <BookOpen size={28} />
                      <p>Dodajte vježbe iz liste desno →</p>
                    </div>
                  ) : (
                    addedExercises.map(ex => (
                      <div key={ex.planId} className={styles.planItem}>
                        <div className={styles.planItemImg}>
                          <img src={ex.imageUrl} alt={ex.name} />
                        </div>
                        <div className={styles.planItemInfo}>
                          <strong>{ex.name}</strong>
                          <div className={styles.planInputs}>
                            <input
                              type="number"
                              value={ex.sets}
                              min="1"
                              onChange={e => updateExField(ex.planId, 'sets', e.target.value)}
                              title="Serije"
                            />
                            <span>×</span>
                            <input
                              type="text"
                              value={ex.reps}
                              onChange={e => updateExField(ex.planId, 'reps', e.target.value)}
                              title="Ponavljanja"
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>pon.</span>
                          </div>
                        </div>
                        <button className={styles.removeBtn} onClick={() => removeFromPlan(ex.planId)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                  onClick={submitPlan}
                  disabled={saving || addedExercises.length === 0}
                >
                  {saving ? <><Loader2 size={16} className="spin" /> Sprema...</> : <><Send size={16} /> Pošalji klijentici</>}
                </button>
              </div>

              {/* Right: Exercise picker */}
              <div className={styles.planRight}>
                <h4 style={{ marginBottom: '10px' }}>Biblioteka vježbi</h4>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                  <input
                    placeholder="Pretraži vježbe..."
                    value={exSearch}
                    onChange={e => setExSearch(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
                <div className={styles.exPickerList}>
                  {filteredEx.map(ex => (
                    <div key={ex.id} className={styles.exPickerItem}>
                      <img src={ex.imageUrl} alt={ex.name} className={styles.exPickerImg} />
                      <div className={styles.exPickerInfo}>
                        <strong>{ex.name}</strong>
                        <span>{ex.category}</span>
                      </div>
                      <button
                        className={`btn btn-primary btn-sm ${addedExercises.find(e => e.id === ex.id) ? styles.addedBtn : ''}`}
                        onClick={() => addToPlan(ex)}
                        disabled={!!addedExercises.find(e => e.id === ex.id)}
                      >
                        {addedExercises.find(e => e.id === ex.id) ? '✓' : <Plus size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

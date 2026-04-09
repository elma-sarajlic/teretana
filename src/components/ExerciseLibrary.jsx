import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { defaultExercises } from '../data/defaultExercises';
import { Search, Plus, Play, Info, X } from 'lucide-react';
import styles from './ExerciseLibrary.module.css';
import toast from 'react-hot-toast';

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [newExercise, setNewExercise] = useState({ name: '', category: '', description: '', videoUrl: '', imageUrl: '' });

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const q = query(collection(db, 'exercises'), orderBy('name'));
      const snap = await getDocs(q);
      let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (list.length === 0) {
        // If Firestore is empty, we could show default ones or seed them
        // For now, let's just use local defaults if nothing in DB
        setExercises(defaultExercises);
      } else {
        setExercises(list);
      }
    } catch (err) {
      console.error(err);
      setExercises(defaultExercises); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exercises'), newExercise);
      toast.success('Vježba dodana u biblioteku!');
      setShowAddModal(false);
      setNewExercise({ name: '', category: '', description: '', videoUrl: '', imageUrl: '' });
      loadExercises();
    } catch (err) {
      toast.error('Greška pri spremanju.');
    }
  };

  const filtered = exercises.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1>BIBLIOTEKA VJEŽBI</h1>
          <p className="text-secondary">Upravljajte bazom vježbi za brže planiranje treninga</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Nova vježba
        </button>
      </div>

      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} />
        <input 
          placeholder="Pretraži vježbe po nazivu ili kategoriji..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.grid}>
        {filtered.map(ex => (
          <div key={ex.id} className={styles.card} onClick={() => setSelectedExercise(ex)}>
            <div className={styles.imageWrapper}>
              <img src={ex.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} alt={ex.name} />
              <div className={styles.playOverlay}>
                <Play fill="white" size={24} />
              </div>
              <span className={styles.categoryBadge}>{ex.category}</span>
            </div>
            <div className={styles.cardBody}>
              <h3>{ex.name}</h3>
              <p>{ex.description?.substring(0, 60)}...</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedExercise && (
        <div className={styles.modalOverlay} onClick={() => setSelectedExercise(null)}>
          <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedExercise(null)}><X /></button>
            <div className={styles.videoContainer}>
              {selectedExercise.videoUrl ? (
                <video src={selectedExercise.videoUrl} autoPlay loop muted playsInline />
              ) : (
                <img src={selectedExercise.imageUrl} alt={selectedExercise.name} />
              )}
            </div>
            <div className={styles.modalContent}>
              <span className="badge badge-accent">{selectedExercise.category}</span>
              <h2>{selectedExercise.name}</h2>
              <p className={styles.desc}>{selectedExercise.description}</p>
              
              <div className={styles.metaInfo}>
                <div className={styles.infoRow}>
                  <Info size={16} />
                  <span>Ova vježba je spremna za dodavanje u bilo koji trening plan.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <h2>Nova Vježba</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="label">Naziv vježbe</label>
                <input required value={newExercise.name} onChange={e => setNewExercise({...newExercise, name: e.target.value})} placeholder="npr. Mrtvo dizanje" />
              </div>
              <div className="form-group">
                <label className="label">Kategorija</label>
                <input required value={newExercise.category} onChange={e => setNewExercise({...newExercise, category: e.target.value})} placeholder="npr. Donji dio tijela" />
              </div>
              <div className="form-group">
                <label className="label">Opis / Upute</label>
                <textarea rows="3" value={newExercise.description} onChange={e => setNewExercise({...newExercise, description: e.target.value})} placeholder="Kako se pravilno izvodi..." />
              </div>
              <div className="form-group">
                <label className="label">URL Slike</label>
                <input value={newExercise.imageUrl} onChange={e => setNewExercise({...newExercise, imageUrl: e.target.value})} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="label">URL Videa (MP4)</label>
                <input value={newExercise.videoUrl} onChange={e => setNewExercise({...newExercise, videoUrl: e.target.value})} placeholder="https://..." />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Odustani</button>
                <button type="submit" className="btn btn-primary">Dodaj u bazu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

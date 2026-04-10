import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { defaultExercises } from '../data/defaultExercises';
import { Search, Plus, Play, Info, X, Trash2, Edit, LayoutGrid, List } from 'lucide-react';
import styles from './ExerciseLibrary.module.css';
import toast from 'react-hot-toast';

const ALL_LABEL = 'Sve';

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [newExercise, setNewExercise] = useState({ name: '', category: '', description: '', videoUrl: '', imageUrl: '' });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const q = query(collection(db, 'exercises'), orderBy('name'));
      const snap = await getDocs(q);
      const dbList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExercises([...defaultExercises, ...dbList]);
    } catch (err) {
      console.error(err);
      setExercises(defaultExercises);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      if (editingExercise) {
        await updateDoc(doc(db, 'exercises', editingExercise.id), newExercise);
        toast.success('Vježba ažurirana!');
      } else {
        await addDoc(collection(db, 'exercises'), newExercise);
        toast.success('Vježba dodana u biblioteku!');
      }
      setShowAddModal(false);
      setEditingExercise(null);
      setNewExercise({ name: '', category: '', description: '', videoUrl: '', imageUrl: '' });
      loadExercises();
    } catch (err) {
      toast.error('Greška pri spremanju.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovu vježbu?')) return;
    try {
      await deleteDoc(doc(db, 'exercises', id));
      toast.success('Vježba obrisana.');
      setSelectedExercise(null);
      loadExercises();
    } catch (err) {
      toast.error('Greška pri brisanju.');
    }
  };

  // Unique categories
  const categories = useMemo(() => {
    const cats = new Set(exercises.map(ex => ex.category));
    return [ALL_LABEL, ...Array.from(cats).sort()];
  }, [exercises]);

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === ALL_LABEL || ex.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [exercises, search, activeCategory]);

  if (loading) return <div className="skeleton" style={{ height: '400px' }} />;

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1>BIBLIOTEKA VJEŽBI</h1>
          <p className="text-secondary">{exercises.length} vježbi · Upravljajte bazom za brže planiranje</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Nova vježba
        </button>
      </div>

      {/* Search + View Toggle */}
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input
            placeholder="Pretraži po nazivu ili kategoriji..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
            title="Prikaz karti"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('list')}
            title="Prikaz liste"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className={styles.categoryChips}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`${styles.chip} ${activeCategory === cat ? styles.chipActive : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <p className={styles.resultCount}>{filtered.length} vježbi</p>

      {/* Grid View */}
      {viewMode === 'grid' && (
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
                <p>{ex.description?.substring(0, 70)}{ex.description?.length > 70 ? '...' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className={styles.listView}>
          {filtered.map(ex => (
            <div key={ex.id} className={styles.listItem} onClick={() => setSelectedExercise(ex)}>
              <div className={styles.listThumb}>
                <img src={ex.imageUrl || 'https://via.placeholder.com/80x60?text=?'} alt={ex.name} />
                {ex.videoUrl && <div className={styles.listPlayBadge}><Play size={10} fill="white" /></div>}
              </div>
              <div className={styles.listInfo}>
                <h4>{ex.name}</h4>
                <p>{ex.description?.substring(0, 100)}{ex.description?.length > 100 ? '...' : ''}</p>
              </div>
              <span className={styles.listCategory}>{ex.category}</span>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
          <p>Nema vježbi za odabrane filtere.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedExercise && (
        <div className={styles.modalOverlay} onClick={() => setSelectedExercise(null)}>
          <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedExercise(null)}><X /></button>
            <div className={styles.videoContainer}>
              {selectedExercise.videoUrl ? (
                <video
                  key={selectedExercise.videoUrl}
                  src={selectedExercise.videoUrl}
                  autoPlay loop muted playsInline controls
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <img
                src={selectedExercise.imageUrl}
                alt={selectedExercise.name}
                style={{ display: selectedExercise.videoUrl ? 'none' : 'block' }}
              />
            </div>
            <div className={styles.modalContent}>
              <span className="badge badge-accent">{selectedExercise.category}</span>
              <h2>{selectedExercise.name}</h2>
              <p className={styles.desc}>{selectedExercise.description}</p>

              <div className={styles.metaInfo}>
                <div className={styles.infoRow}>
                  <Info size={16} />
                  <span>Ova vježba je dostupna za dodavanje u bilo koji plan treninga.</span>
                </div>
              </div>

              {selectedExercise.id && !selectedExercise.id.toString().startsWith('e') && (
                <div className={styles.adminActions}>
                  <button className="btn btn-secondary" onClick={() => {
                    setEditingExercise(selectedExercise);
                    setNewExercise({ ...selectedExercise });
                    setShowAddModal(true);
                    setSelectedExercise(null);
                  }}>
                    <Edit size={16} /> Uredi
                  </button>
                  <button className="btn btn-ghost text-error" onClick={() => handleDelete(selectedExercise.id)}>
                    <Trash2 size={16} /> Obriši
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowAddModal(false); setEditingExercise(null); }}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <h2>{editingExercise ? 'Uredi Vježbu' : 'Nova Vježba'}</h2>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="label">Naziv vježbe</label>
                <input required value={newExercise.name} onChange={e => setNewExercise({ ...newExercise, name: e.target.value })} placeholder="npr. Mrtvo dizanje" />
              </div>
              <div className="form-group">
                <label className="label">Kategorija</label>
                <input required value={newExercise.category} onChange={e => setNewExercise({ ...newExercise, category: e.target.value })} placeholder="npr. Donji dio tijela" list="cat-suggestions" />
                <datalist id="cat-suggestions">
                  {categories.filter(c => c !== ALL_LABEL).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="label">Opis / Upute</label>
                <textarea rows="3" value={newExercise.description} onChange={e => setNewExercise({ ...newExercise, description: e.target.value })} placeholder="Kako se pravilno izvodi..." />
              </div>
              <div className="form-group">
                <label className="label">URL Slike</label>
                <input value={newExercise.imageUrl} onChange={e => setNewExercise({ ...newExercise, imageUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="label">URL Videa (MP4)</label>
                <input value={newExercise.videoUrl} onChange={e => setNewExercise({ ...newExercise, videoUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddModal(false); setEditingExercise(null); }}>Odustani</button>
                <button type="submit" className="btn btn-primary">{editingExercise ? 'Spremi izmjene' : 'Dodaj u bazu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

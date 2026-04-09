import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './ClientsList.module.css';

export default function ClientsList() {
  const { userProfile } = useAuth();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'client'), where('trainerId', '==', userProfile.id));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    setClients(list);
  };

  const createClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: form.name,
        email: form.email,
        role: 'client',
        trainerId: userProfile.id,
        createdAt: new Date(),
        measurements: [],
        notes: '',
      });
      toast.success(`Profil za ${form.name} kreiran!`);
      setShowModal(false);
      setForm({ name: '', email: '', password: '' });
      loadClients();
    } catch (err) {
      toast.error('Greška: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1>KLIJENTICE</h1>
          <p className={styles.sub}>{clients.length} aktivnih klijentica</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Nova klijentica
        </button>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input
          placeholder="Pretraga po imenu ili emailu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.grid}>
        {filtered.map(client => (
          <div
            key={client.id}
            className={styles.clientCard}
            onClick={() => navigate(`/trainer/clients/${client.id}`)}
          >
            <div className={styles.clientAvatar}>
              {client.photoURL
                ? <img src={client.photoURL} alt={client.name} />
                : <span>{client.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className={styles.clientInfo}>
              <div className={styles.clientName}>{client.name}</div>
              <div className={styles.clientEmail}>{client.email}</div>
              {client.measurements?.length > 0 && (
                <div className={styles.clientMeta}>
                  <span>Visina: {client.measurements[client.measurements.length-1]?.height || '—'} cm</span>
                  <span>Težina: {client.measurements[client.measurements.length-1]?.weight || '—'} kg</span>
                </div>
              )}
            </div>
            <ChevronRight size={18} className={styles.arrow} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <p>Nema klijentica{search ? ' koji odgovara pretrazi' : ''}.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nova klijentica</h2>
            <p className={styles.modalSub}>Kreiraće se nalog za prijavu.</p>
            <form onSubmit={createClient}>
              <div className="form-group">
                <label className="label">Ime i prezime</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Ana Petrović" />
              </div>
              <div className="form-group">
                <label className="label">Email adresa</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="ana@email.com" />
              </div>
              <div className="form-group">
                <label className="label">Lozinka (privremena)</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Min. 6 znakova" minLength={6} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Odustani</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Kreira...' : 'Kreiraj profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

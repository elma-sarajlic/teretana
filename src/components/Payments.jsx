import React, { useEffect, useState, useMemo } from 'react';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
  CreditCard, Plus, Trash2, TrendingUp, Calendar, CheckCircle2, XCircle, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Payments.module.css';

/* ── helpers ─────────────────────────────────────────────── */
const now = new Date();
const thisYear  = now.getFullYear();
const thisMonth = now.getMonth();          // 0-indexed
const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

const MONTHS_HR = ['Januar','Februar','Mart','April','Maj','Juni','Juli','August','Septembar','Oktobar','Novembar','Decembar'];

function inMonth(date, month, year) {
  return date.getMonth() === month && date.getFullYear() === year;
}

/* ── component ───────────────────────────────────────────── */
export default function Payments() {
  const { userProfile } = useAuth();
  const [clients,  setClients]  = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // modal state
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm] = useState({ clientId: '', amount: '', date: new Date().toISOString().slice(0,10), note: '' });
  const [saving, setSaving] = useState(false);

  // filter
  const [filterClient, setFilterClient] = useState('all');
  const [filterMonth,  setFilterMonth]  = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      // load clients
      const cq = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        where('trainerId', '==', userProfile.id)
      );
      const csnap = await getDocs(cq);
      const cl = csnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(cl);

      // load all payments for this trainer
      const pq = query(
        collection(db, 'payments'),
        where('trainerId', '==', userProfile.id),
        orderBy('date', 'desc')
      );
      const psnap = await getDocs(pq);
      setPayments(psnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Greška pri učitavanju podataka.');
    } finally {
      setLoading(false);
    }
  };

  /* ── add payment ─────────────────────────────────────── */
  const addPayment = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Odaberite klijenticu.'); return; }
    setSaving(true);
    try {
      const client = clients.find(c => c.id === form.clientId);
      const docRef = await addDoc(collection(db, 'payments'), {
        trainerId:  userProfile.id,
        clientId:   form.clientId,
        clientName: client?.name || '',
        amount:     parseFloat(form.amount),
        date:       form.date,
        note:       form.note,
        createdAt:  serverTimestamp(),
      });
      setPayments(prev => [
        { id: docRef.id, trainerId: userProfile.id, clientId: form.clientId,
          clientName: client?.name || '', amount: parseFloat(form.amount),
          date: form.date, note: form.note },
        ...prev,
      ]);
      toast.success('Uplata dodana!');
      setShowModal(false);
      setForm({ clientId: '', amount: '', date: new Date().toISOString().slice(0,10), note: '' });
    } catch (err) {
      toast.error('Greška: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── delete payment ──────────────────────────────────── */
  const deletePayment = async (pid) => {
    if (!window.confirm('Obrisati ovu uplatu?')) return;
    try {
      await deleteDoc(doc(db, 'payments', pid));
      setPayments(prev => prev.filter(p => p.id !== pid));
      toast.success('Uplata obrisana.');
    } catch (err) {
      toast.error('Greška: ' + err.message);
    }
  };

  /* ── earnings calculations ───────────────────────────── */
  const stats = useMemo(() => {
    let thisM = 0, lastM = 0, yearly = 0;
    payments.forEach(p => {
      const d = new Date(p.date);
      if (inMonth(d, thisMonth, thisYear))   thisM  += p.amount;
      if (inMonth(d, lastMonth, lastMonthYear)) lastM += p.amount;
      if (d.getFullYear() === thisYear)       yearly += p.amount;
    });
    return { thisM, lastM, yearly };
  }, [payments]);

  /* ── filtered list ───────────────────────────────────── */
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const d = new Date(p.date);
      const clientOk = filterClient === 'all' || p.clientId === filterClient;
      let monthOk = true;
      if (filterMonth !== 'all') {
        const [fy, fm] = filterMonth.split('-').map(Number);
        monthOk = d.getFullYear() === fy && d.getMonth() === fm;
      }
      return clientOk && monthOk;
    });
  }, [payments, filterClient, filterMonth]);

  /* ── last payment per client ─────────────────────────── */
  const lastPaid = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      if (!map[p.clientId] || p.date > map[p.clientId]) map[p.clientId] = p.date;
    });
    return map;
  }, [payments]);

  const isPaidThisMonth = (clientId) => {
    const last = lastPaid[clientId];
    if (!last) return false;
    const d = new Date(last);
    return inMonth(d, thisMonth, thisYear);
  };

  /* ── month options for filter ────────────────────────── */
  const monthOptions = useMemo(() => {
    const set = new Set();
    payments.forEach(p => {
      const d = new Date(p.date);
      set.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(set).sort((a,b) => b.localeCompare(a));
  }, [payments]);

  if (loading) return <div className="skeleton" style={{ height: 400 }} />;

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1>NAPLATE</h1>
          <p className={styles.sub}>Praćenje uplata i zarada</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Dodaj uplatu
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(61,214,140,0.12)', color: 'var(--green)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.thisM.toFixed(2)} KM</div>
            <div className={styles.statLabel}>Ovaj mjesec ({MONTHS_HR[thisMonth]})</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245,200,66,0.12)', color: 'var(--yellow)' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.lastM.toFixed(2)} KM</div>
            <div className={styles.statLabel}>Prošli mjesec ({MONTHS_HR[lastMonth]})</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{stats.yearly.toFixed(2)} KM</div>
            <div className={styles.statLabel}>Ukupno {thisYear}. godina</div>
          </div>
        </div>
      </div>

      {/* ── Client Status Grid ── */}
      <div className={styles.sectionTitle}>Status klijentica ovaj mjesec</div>
      <div className={styles.clientStatusGrid}>
        {clients.map(c => (
          <div key={c.id} className={styles.clientStatusCard}>
            <div className={styles.clientAvatar}>
              {c.photoURL
                ? <img src={c.photoURL} alt={c.name} />
                : <span>{c.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className={styles.clientStatusInfo}>
              <div className={styles.clientName}>{c.name}</div>
              <div className={styles.clientLastPaid}>
                {lastPaid[c.id]
                  ? `Zadnja uplata: ${lastPaid[c.id]}`
                  : 'Nema uplata'}
              </div>
            </div>
            {isPaidThisMonth(c.id)
              ? <CheckCircle2 size={20} className={styles.paidIcon} />
              : <XCircle size={20} className={styles.unpaidIcon} />
            }
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <div className={styles.sectionTitle} style={{ margin: 0 }}>Historija uplata</div>
        <div className={styles.filterRow}>
          <div className={styles.selectWrapper}>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}>
              <option value="all">Sve klijentice</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className={styles.selectChevron} />
          </div>
          <div className={styles.selectWrapper}>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="all">Svi mjeseci</option>
              {monthOptions.map(mo => {
                const [fy, fm] = mo.split('-').map(Number);
                return <option key={mo} value={mo}>{MONTHS_HR[fm]} {fy}</option>;
              })}
            </select>
            <ChevronDown size={14} className={styles.selectChevron} />
          </div>
        </div>
      </div>

      {/* ── Payment Table ── */}
      <div className={styles.tableWrapper}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <CreditCard size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p>Nema uplata za odabrane filtere.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Klijentica</th>
                <th>Datum</th>
                <th>Iznos</th>
                <th>Napomena</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className={styles.tableClient}>
                      <div className={styles.tableAvatar}>
                        {clients.find(c => c.id === p.clientId)?.photoURL
                          ? <img src={clients.find(c => c.id === p.clientId).photoURL} alt="" />
                          : <span>{p.clientName?.[0]?.toUpperCase()}</span>
                        }
                      </div>
                      {p.clientName}
                    </div>
                  </td>
                  <td>{p.date}</td>
                  <td><strong className={styles.amount}>{parseFloat(p.amount).toFixed(2)} KM</strong></td>
                  <td><span className={styles.note}>{p.note || '—'}</span></td>
                  <td>
                    <button className={`btn btn-ghost btn-sm ${styles.deleteBtn}`} onClick={() => deletePayment(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add Payment Modal ── */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Nova uplata</h2>
            <p className={styles.modalSub}>Unesite podatke o uplati pretplate.</p>
            <form onSubmit={addPayment}>
              <div className="form-group">
                <label className="label">Klijentica</label>
                <div className={styles.selectWrapper}>
                  <select
                    value={form.clientId}
                    onChange={e => setForm({ ...form, clientId: e.target.value })}
                    required
                  >
                    <option value="">— Odaberite klijenticu —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={14} className={styles.selectChevron} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="label">Iznos (KM)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="50.00"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Datum uplate</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Napomena (opciono)</label>
                <input
                  placeholder="npr. April pretplata, 1 mjesec"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Odustani</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Sprema...' : 'Dodaj uplatu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

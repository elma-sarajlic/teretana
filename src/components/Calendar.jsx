import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { hr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Dumbbell, Clock, Edit2, Trash2, AlertCircle } from 'lucide-react';
import styles from './Calendar.module.css';
import toast from 'react-hot-toast';

const DURATION_OPTIONS = ['30 min', '45 min', '60 min', '90 min'];
const EMPTY_FORM = { clientId: '', time: '10:00', duration: '60 min', note: '' };

export default function Calendar() {
  const { userProfile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null); // null = add mode, appt obj = edit mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    const qClients = query(
      collection(db, 'users'),
      where('trainerId', '==', userProfile.id),
      where('role', '==', 'client')
    );
    const snapClients = await getDocs(qClients);
    setClients(snapClients.docs.map(d => ({ id: d.id, ...d.data() })));

    const qAppts = query(collection(db, 'appointments'), where('trainerId', '==', userProfile.id));
    const snapAppts = await getDocs(qAppts);
    setAppointments(snapAppts.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  // Check for time conflict on the selected day (excluding the appointment being edited)
  const hasConflict = (time, excludeId = null) => {
    const dayAppts = appointments.filter(a =>
      a.date === format(selectedDay, 'yyyy-MM-dd') && a.id !== excludeId
    );
    return dayAppts.some(a => a.time === time);
  };

  const openAdd = () => {
    setEditingAppt(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (appt, e) => {
    e.stopPropagation();
    setEditingAppt(appt);
    setForm({
      clientId: appt.clientId,
      time: appt.time,
      duration: appt.duration || '60 min',
      note: appt.note || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.clientId) return toast.error('Odaberite klijenticu');

    if (hasConflict(form.time, editingAppt?.id)) {
      toast.error('Već imate termin u to vrijeme!');
      return;
    }

    setSaving(true);
    try {
      const client = clients.find(c => c.id === form.clientId);
      const data = {
        trainerId: userProfile.id,
        clientId: form.clientId,
        clientName: client.name,
        date: format(selectedDay, 'yyyy-MM-dd'),
        time: form.time,
        duration: form.duration,
        note: form.note,
        status: 'scheduled',
      };

      if (editingAppt) {
        await updateDoc(doc(db, 'appointments', editingAppt.id), data);
        toast.success('Termin ažuriran!');
      } else {
        await addDoc(collection(db, 'appointments'), data);
        toast.success('Trening zakazan!');
      }

      setShowModal(false);
      setEditingAppt(null);
      setForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      toast.error('Greška pri spremanju.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (apptId, e) => {
    e.stopPropagation();
    if (!window.confirm('Obrisati ovaj termin?')) return;
    try {
      await deleteDoc(doc(db, 'appointments', apptId));
      toast.success('Termin obrisan.');
      loadData();
    } catch (err) {
      toast.error('Greška pri brisanju.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAppt(null);
    setForm(EMPTY_FORM);
  };

  const apptsForDay = appointments
    .filter(a => a.date === format(selectedDay, 'yyyy-MM-dd'))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1>RASPORED TRENINGA</h1>
          <p className="text-secondary">{format(currentMonth, 'MMMM yyyy.', { locale: hr }).toUpperCase()}</p>
        </div>
        <div className={styles.navBtns}>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(new Date())}>Danas</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.calendar}>
          <div className={styles.weekDays}>
            {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className={styles.daysGrid}>
            {days.map(day => {
              const appts = appointments.filter(a => a.date === format(day, 'yyyy-MM-dd'));
              const isSelected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <div
                  key={day.toString()}
                  className={`${styles.day} ${!isCurrentMonth ? styles.otherMonth : ''} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className={styles.dayNum}>{format(day, 'd')}</span>
                  <div className={styles.dayHooks}>
                    {appts.slice(0, 3).map((a, i) => {
                      const client = clients.find(c => c.id === a.clientId);
                      return (
                        <div key={i} className={styles.miniAvatar} title={`${a.time} – ${a.clientName}`}>
                          {client?.photoURL
                            ? <img src={client.photoURL} alt={a.clientName} />
                            : <span>{a.clientName?.[0]}</span>
                          }
                        </div>
                      );
                    })}
                    {appts.length > 3 && <span className={styles.plusMore}>+{appts.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>{format(selectedDay, 'd. MMMM', { locale: hr })}</h3>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <Plus size={14} /> Novi termin
            </button>
          </div>

          <div className={styles.apptList}>
            {apptsForDay.length === 0 ? (
              <div className={styles.empty}>Nema zakazanih treninga za ovaj dan.</div>
            ) : (
              apptsForDay.map(appt => {
                const client = clients.find(c => c.id === appt.clientId);
                return (
                  <div key={appt.id} className={styles.apptCard}>
                    <div className={styles.apptTime}>
                      <span>{appt.time}</span>
                      {appt.duration && (
                        <span className={styles.apptDuration}><Clock size={10} /> {appt.duration}</span>
                      )}
                    </div>
                    <div className={styles.apptAvatar}>
                      {client?.photoURL
                        ? <img src={client.photoURL} alt={appt.clientName} />
                        : <span>{appt.clientName?.[0]}</span>
                      }
                    </div>
                    <div className={styles.apptInfo}>
                      <h4>{appt.clientName}</h4>
                      <div className={styles.apptMeta}>
                        <span><Dumbbell size={12} /> Individualni trening</span>
                        {appt.note && <span className={styles.note}>{appt.note}</span>}
                      </div>
                    </div>
                    <div className={styles.apptActions}>
                      <button
                        className={styles.apptActionBtn}
                        onClick={(e) => openEdit(appt, e)}
                        title="Uredi termin"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className={`${styles.apptActionBtn} ${styles.deleteBtn}`}
                        onClick={(e) => handleDelete(appt.id, e)}
                        title="Obriši termin"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingAppt ? 'Uredi Termin' : 'Zakaži Trening'}</h2>
              <button className={styles.modalCloseBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <p className="text-secondary">{format(selectedDay, 'dd.MM.yyyy.')}</p>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="label">Klijentica</label>
                <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} required>
                  <option value="">Odaberi klijenticu...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="label">Vrijeme</label>
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="label">Trajanje</label>
                  <select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}>
                    {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {hasConflict(form.time, editingAppt?.id) && (
                <div className={styles.conflictWarning}>
                  <AlertCircle size={14} /> Već postoji termin u {form.time}
                </div>
              )}

              <div className="form-group">
                <label className="label">Napomena (opcionalno)</label>
                <textarea rows="2" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="npr. Fokus na noge..." />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Odustani</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Sprema...' : editingAppt ? 'Spremi izmjene' : 'Potvrdi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addDays, parseISO
} from 'date-fns';
import { hr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, User, Dumbbell, MapPin, Clock } from 'lucide-react';
import styles from './Calendar.module.css';
import toast from 'react-hot-toast';

export default function Calendar() {
  const { userProfile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clientId: '', time: '10:00', note: '' });

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    // Load clients
    const qClients = query(collection(db, 'users'), where('trainerId', '==', userProfile.id), where('role', '==', 'client'));
    const snapClients = await getDocs(qClients);
    setClients(snapClients.docs.map(d => ({ id: d.id, ...d.data() })));

    // Load appointments for month
    const qAppts = query(collection(db, 'appointments'), where('trainerId', '==', userProfile.id));
    const snapAppts = await getDocs(qAppts);
    setAppointments(snapAppts.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.clientId) return toast.error('Odaberite klijenticu');
    
    try {
      const client = clients.find(c => c.id === form.clientId);
      const newAppt = {
        trainerId: userProfile.id,
        clientId: form.clientId,
        clientName: client.name,
        date: format(selectedDay, 'yyyy-MM-dd'),
        time: form.time,
        note: form.note,
        status: 'scheduled'
      };
      await addDoc(collection(db, 'appointments'), newAppt);
      toast.success('Trening zakazan!');
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error('Greška pri zakazivanju.');
    }
  };

  const apptsForDay = appointments.filter(a => a.date === format(selectedDay, 'yyyy-MM-dd'));

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
                    {appts.slice(0, 3).map((a, i) => (
                      <div key={i} className={styles.apptDot} />
                    ))}
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
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Novi termin
            </button>
          </div>
          
          <div className={styles.apptList}>
            {apptsForDay.length === 0 ? (
              <div className={styles.empty}>Nema zakazanih treninga za ovaj dan.</div>
            ) : (
              apptsForDay.sort((a,b) => a.time.localeCompare(b.time)).map(appt => (
                <div key={appt.id} className={styles.apptCard}>
                  <div className={styles.apptTime}>{appt.time}</div>
                  <div className={styles.apptInfo}>
                    <h4>{appt.clientName}</h4>
                    <div className={styles.apptMeta}>
                      <span><Dumbbell size={12} /> Individualni trening</span>
                      {appt.note && <span><Info size={12} /> {appt.note}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Zakaži Trening</h2>
            <p className="text-secondary">{format(selectedDay, 'dd.MM.yyyy.')}</p>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="label">Klijentica</label>
                <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} required>
                  <option value="">Odaberi klijenticu...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Vrijeme</label>
                <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="label">Napomena (opcionalno)</label>
                <textarea rows="2" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="npr. Fokus na noge..." />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Odustani</button>
                <button type="submit" className="btn btn-primary">Potvrdi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

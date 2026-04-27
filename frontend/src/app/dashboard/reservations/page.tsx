'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getReservations, deleteReservation, getAllServices, createReservation, updateReservation, getAuditLogs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { format, isValid, parse } from 'date-fns';
import toast from 'react-hot-toast';
import { useModalScrollLock } from '@/lib/useModalScrollLock';

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers  (DD/MM/YYYY with 2-digit year support)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse free-form date text → "YYYY-MM-DD" for the hidden ISO field.
 *
 * Accepts:
 *   250526        → 25 May 2026
 *   25/05/26      → 25 May 2026
 *   25/05/2026    → 25 May 2026
 *   2026-05-25    → pass-through (already ISO)
 */
function parseFlexDate(raw: string): string {
  const s = raw.trim();
  if (!s) return '';

  // Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Strip all non-digits for compact forms
  const digits = s.replace(/\D/g, '');

  // 6-digit: DDMMYY
  if (digits.length === 6) {
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yy = parseInt(digits.slice(4, 6), 10);
    const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
    const d = parse(`${dd}/${mm}/${yyyy}`, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  // 8-digit: DDMMYYYY
  if (digits.length === 8) {
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    const d = parse(`${dd}/${mm}/${yyyy}`, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  // Slash/dash separated: DD/MM/YY or DD/MM/YYYY
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    let [dd, mm, yyyy] = parts;
    if (yyyy.length === 2) {
      const yy = parseInt(yyyy, 10);
      yyyy = String(yy >= 50 ? 1900 + yy : 2000 + yy);
    }
    const d = parse(`${dd}/${mm}/${yyyy}`, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  return raw; // return as-is; validation will catch invalid values
}

/** Format ISO "YYYY-MM-DD" to display "DD/MM/YYYY" */
function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (!isValid(d)) return iso;
  return format(d, 'dd/MM/yyyy');
}

/** Convert ISO datetime string → { displayDate, hour12, minute, ampm } */
function splitDateTime(iso: string) {
  if (!iso) return { isoDate: '', displayDate: '', hour12: '', minute: '', ampm: 'AM' as 'AM' | 'PM' };
  const d = new Date(iso);
  if (!isValid(d)) return { isoDate: '', displayDate: '', hour12: '', minute: '', ampm: 'AM' as 'AM' | 'PM' };
  const h24 = d.getHours();
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const isoDate = format(d, 'yyyy-MM-dd');
  return {
    isoDate,
    displayDate: format(d, 'dd/MM/yyyy'),
    hour12: String(h12),
    minute: format(d, 'mm'),
    ampm,
  };
}

/** Build ISO datetime string from parts */
function buildISO(isoDate: string, hour12: string, minute: string, ampm: 'AM' | 'PM'): string {
  if (!isoDate || !hour12 || !minute) return '';
  let h = parseInt(hour12, 10) % 12;
  if (ampm === 'PM') h += 12;
  const mm = minute.padStart(2, '0');
  const hh = String(h).padStart(2, '0');
  return `${isoDate}T${hh}:${mm}:00`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time input with AM/PM
// ─────────────────────────────────────────────────────────────────────────────

interface TimeState { hour12: string; minute: string; ampm: 'AM' | 'PM' }

function TimeInput({ value, onChange, required }: {
  value: TimeState;
  onChange: (v: TimeState) => void;
  required?: boolean;
}) {
  // When user types hour digits, auto-parse 12h
  const handleHourBlur = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    // If user typed 0-12, treat as-is; 13-23 → convert to 12h + PM
    if (n > 12 && n <= 23) {
      onChange({ ...value, hour12: String(n - 12), ampm: 'PM' });
    } else if (n === 0) {
      onChange({ ...value, hour12: '12', ampm: 'AM' });
    } else {
      onChange({ ...value, hour12: String(n) });
    }
  };

  const handleMinuteBlur = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    const n = parseInt(digits, 10);
    if (isNaN(n)) return;
    onChange({ ...value, minute: String(Math.min(59, n)).padStart(2, '0') });
  };

  return (
    <div className="flex items-center gap-1">
      {/* Hour */}
      <input
        type="text"
        inputMode="numeric"
        placeholder="HH"
        maxLength={2}
        required={required}
        value={value.hour12}
        onChange={e => onChange({ ...value, hour12: e.target.value.replace(/\D/g, '').slice(0, 2) })}
        onBlur={e => handleHourBlur(e.target.value)}
        className="input-field w-14 text-center"
      />
      <span className="text-charcoal-500 font-medium">:</span>
      {/* Minute */}
      <input
        type="text"
        inputMode="numeric"
        placeholder="MM"
        maxLength={2}
        required={required}
        value={value.minute}
        onChange={e => onChange({ ...value, minute: e.target.value.replace(/\D/g, '').slice(0, 2) })}
        onBlur={e => handleMinuteBlur(e.target.value)}
        className="input-field w-14 text-center"
      />
      {/* AM/PM selector */}
      <select
        value={value.ampm}
        onChange={e => onChange({ ...value, ampm: e.target.value as 'AM' | 'PM' })}
        className="input-field w-20 text-center"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date input (DD/MM/YYYY display, ISO internally)
// ─────────────────────────────────────────────────────────────────────────────

function DateInput({ isoValue, onChange, required }: {
  isoValue: string;
  onChange: (iso: string) => void;
  required?: boolean;
}) {
  const [display, setDisplay] = useState(isoToDisplay(isoValue));

  useEffect(() => { setDisplay(isoToDisplay(isoValue)); }, [isoValue]);

  const handleBlur = () => {
    const iso = parseFlexDate(display);
    setDisplay(isoToDisplay(iso) || display);
    onChange(iso);
  };

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YY or DDMMYY"
        required={required}
        value={display}
        onChange={e => setDisplay(e.target.value)}
        onBlur={handleBlur}
        className="input-field"
      />
      <p className="text-[10px] text-charcoal-400 mt-0.5">e.g. 250526 → 25/05/2026</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

interface ResForm {
  serviceId: string;
  guestName: string;
  guestCount: number;
  isoDate: string;
  time: TimeState;
  notes: string;
  totalPrice: string;
  currency: string;
  status: string;
}

const emptyTime: TimeState = { hour12: '', minute: '', ampm: 'AM' };

const emptyForm: ResForm = {
  serviceId: '', guestName: '', guestCount: 1,
  isoDate: '', time: emptyTime,
  notes: '', totalPrice: '', currency: 'EUR', status: 'PENDING',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ARRANGED: 'bg-green-100 text-green-800',
  NOT_ARRANGED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-charcoal-100 text-charcoal-600',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

const actionColors: Record<string, string> = {
  CREATE: 'text-green-600', UPDATE: 'text-blue-600', DELETE: 'text-red-500',
};

// ─────────────────────────────────────────────────────────────────────────────
// Safe modal backdrop
// ─────────────────────────────────────────────────────────────────────────────

function SafeModal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={e => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
      onMouseUp={e => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current) onClose(); mouseDownOnBackdrop.current = false; }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// History panel
// ─────────────────────────────────────────────────────────────────────────────

function HistoryPanel({ reservationId, onClose }: { reservationId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getAuditLogs(reservationId).then(setLogs).finally(() => setLoading(false)); }, [reservationId]);

  return (
    <SafeModal onClose={onClose}>
      <div className="bg-white w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-xl font-light text-charcoal-900">Change History</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {loading ? <p className="text-charcoal-400 text-sm text-center py-6">Loading…</p>
            : logs.length === 0 ? <p className="text-charcoal-400 text-sm text-center py-6">No history yet.</p>
            : logs.map((log: any) => (
              <div key={log.id} className="border-l-2 border-charcoal-100 pl-3 py-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${actionColors[log.action] || 'text-charcoal-600'}`}>{log.action}</span>
                  <span className="text-[11px] text-charcoal-500">{log.user?.name}</span>
                  <span className="text-[10px] text-charcoal-400 ml-auto">{format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                {log.changes && typeof log.changes === 'object' && Object.keys(log.changes).length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(log.changes).map(([key, val]: [string, any]) => (
                      <div key={key} className="text-[10px] text-charcoal-500">
                        <span className="font-medium text-charcoal-700">{key}:</span>{' '}
                        {val?.before !== undefined
                          ? <><span className="line-through text-red-400">{String(val.before ?? '—')}</span>{' → '}<span className="text-green-600">{String(val.after ?? '—')}</span></>
                          : <span>{String(val ?? '—')}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </SafeModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared form fields
// ─────────────────────────────────────────────────────────────────────────────

function ReservationFormFields({ form, services, onChange, isEdit }: {
  form: ResForm;
  services: any[];
  onChange: (updates: Partial<ResForm>) => void;
  isEdit?: boolean;
}) {
  const handleServiceChange = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    const updates: Partial<ResForm> = { serviceId };
    if (svc?.priceAmount) {
      updates.totalPrice = String(svc.priceAmount);
      if (svc.priceCurrency) updates.currency = svc.priceCurrency;
    }
    onChange(updates);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="label">Service</label>
        <select required value={form.serviceId} onChange={e => handleServiceChange(e.target.value)} className="input-field">
          <option value="">Select a service…</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.category?.name} — {s.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Guest Name</label>
          <input required value={form.guestName} onChange={e => onChange({ guestName: e.target.value })} className="input-field" placeholder="Full name" />
        </div>
        <div>
          <label className="label">No. of Guests</label>
          <input type="number" min={1} required value={form.guestCount} onChange={e => onChange({ guestCount: Number(e.target.value) })} className="input-field" />
        </div>
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date <span className="text-red-400">*</span></label>
          <DateInput isoValue={form.isoDate} onChange={isoDate => onChange({ isoDate })} required />
        </div>
        <div>
          <label className="label">Time <span className="text-red-400">*</span></label>
          <TimeInput value={form.time} onChange={time => onChange({ time })} required />
          <p className="text-[10px] text-charcoal-400 mt-0.5">Type 15 → auto 03 PM</p>
        </div>
      </div>

      {isEdit && (
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={e => onChange({ status: e.target.value })} className="input-field">
            <option>PENDING</option><option>ARRANGED</option><option>NOT_ARRANGED</option>
            <option>COMPLETED</option><option>CANCELLED</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Total Price</label>
          <input type="number" value={form.totalPrice} onChange={e => onChange({ totalPrice: e.target.value })} className="input-field" placeholder="Auto-filled" />
          <p className="text-[10px] text-charcoal-400 mt-0.5">Adjust for discounts</p>
        </div>
        <div>
          <label className="label">Currency</label>
          <select value={form.currency} onChange={e => onChange({ currency: e.target.value })} className="input-field">
            <option>EUR</option><option>USD</option><option>SCR</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => onChange({ notes: e.target.value })} className="input-field resize-none" placeholder="Discount, supplement, special requests…" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reservation view/edit modal
// ─────────────────────────────────────────────────────────────────────────────

function ReservationModal({ reservation, services, mode: initialMode, onClose, onSaved, onDeleted, currentUser }: {
  reservation: any;
  services: any[];
  mode: 'view' | 'edit';
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  currentUser: any;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const split = splitDateTime(reservation.dateTime);
  const [form, setForm] = useState<ResForm>({
    serviceId: reservation.serviceId,
    guestName: reservation.guestName,
    guestCount: reservation.guestCount,
    isoDate: split.isoDate,
    time: { hour12: split.hour12, minute: split.minute, ampm: split.ampm },
    notes: reservation.notes || '',
    totalPrice: reservation.totalPrice != null ? String(reservation.totalPrice) : '',
    currency: reservation.currency || 'EUR',
    status: reservation.status,
  });

  const update = (updates: Partial<ResForm>) => setForm(f => ({ ...f, ...updates }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.isoDate || !form.time.hour12 || !form.time.minute) {
      toast.error('Date and time are required'); return;
    }
    const dateTime = buildISO(form.isoDate, form.time.hour12, form.time.minute, form.time.ampm);
    setSaving(true);
    try {
      await updateReservation(reservation.id, {
        serviceId: form.serviceId, guestName: form.guestName,
        guestCount: Number(form.guestCount), dateTime,
        status: form.status, notes: form.notes,
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
        currency: form.currency,
      });
      toast.success('Reservation updated'); onSaved(); setMode('view');
    } catch { toast.error('Failed to update reservation'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this reservation?')) return;
    setDeleting(true);
    try { await deleteReservation(reservation.id); toast.success('Deleted'); onDeleted(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  const canDelete = currentUser?.role === 'ADMIN';
  const serviceName = services.find(s => s.id === reservation.serviceId)?.name || reservation.service?.name || '—';

  // Format datetime for display: DD/MM/YYYY HH:MM AM/PM
  const displayDT = (() => {
    const d = new Date(reservation.dateTime);
    if (!isValid(d)) return reservation.dateTime;
    const h24 = d.getHours();
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${format(d, 'dd/MM/yyyy')} ${String(h12).padStart(2, '0')}:${format(d, 'mm')} ${ampm}`;
  })();

  useModalScrollLock(true);

  return (
    <>
      <SafeModal onClose={onClose}>
        <div className="bg-white w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
          onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>

          <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-0.5">Reservation</p>
              <h2 className="font-display text-2xl font-light text-charcoal-900">{reservation.guestName}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColors[reservation.status]}`}>{reservation.status}</span>
              <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-charcoal-50 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
              className={`text-xs tracking-widest uppercase transition-colors ${mode === 'edit' ? 'text-gold-600 font-semibold' : 'text-gold-500 hover:text-gold-600'}`}>
              {mode === 'edit' ? '← View' : 'Edit'}
            </button>
            <span className="text-charcoal-200">|</span>
            <button onClick={() => setShowHistory(true)} className="text-xs tracking-widest uppercase text-charcoal-400 hover:text-charcoal-900 transition-colors">History</button>
            {canDelete && (
              <><span className="text-charcoal-200">|</span>
                <button onClick={handleDelete} disabled={deleting} className="text-xs tracking-widest uppercase text-red-400 hover:text-red-600 transition-colors">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {mode === 'view' ? (
              <div className="p-6 space-y-1">
                {[
                  { label: 'Service', value: serviceName },
                  { label: 'Guest Name', value: reservation.guestName },
                  { label: 'Guests', value: String(reservation.guestCount) },
                  { label: 'Date & Time', value: displayDT },
                  { label: 'Status', value: reservation.status },
                  ...(reservation.totalPrice != null ? [{ label: 'Price', value: `${reservation.totalPrice} ${reservation.currency}` }] : []),
                  ...(reservation.notes ? [{ label: 'Notes', value: reservation.notes }] : []),
                  ...(reservation.user ? [{ label: 'Created by', value: reservation.user.name }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5 border-b border-charcoal-50 last:border-0">
                    <span className="text-xs tracking-widest uppercase text-charcoal-400 flex-shrink-0">{label}</span>
                    <span className="text-sm text-charcoal-900 text-right">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <form id="res-edit-form" onSubmit={handleSave}>
                <ReservationFormFields form={form} services={services} onChange={update} isEdit />
              </form>
            )}
          </div>

          {mode === 'edit' && (
            <div className="px-6 py-4 border-t border-charcoal-100 flex gap-3 flex-shrink-0">
              <button type="submit" form="res-edit-form" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" onClick={() => setMode('view')} className="btn-ghost flex-1">Cancel</button>
            </div>
          )}
        </div>
      </SafeModal>
      {showHistory && <HistoryPanel reservationId={reservation.id} onClose={() => setShowHistory(false)} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New reservation modal
// ─────────────────────────────────────────────────────────────────────────────

function NewReservationModal({ services, onClose, onCreated }: {
  services: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<ResForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const update = (updates: Partial<ResForm>) => setForm(f => ({ ...f, ...updates }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.isoDate || !form.time.hour12 || !form.time.minute) {
      toast.error('Date and time are required'); return;
    }
    const dateTime = buildISO(form.isoDate, form.time.hour12, form.time.minute, form.time.ampm);
    setSaving(true);
    try {
      await createReservation({
        serviceId: form.serviceId, guestName: form.guestName,
        guestCount: Number(form.guestCount), dateTime,
        notes: form.notes,
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
        currency: form.currency,
      });
      toast.success('Reservation created'); onCreated(); onClose();
    } catch { toast.error('Failed to create reservation'); }
    finally { setSaving(false); }
  };

  useModalScrollLock(true);

  return (
    <SafeModal onClose={onClose}>
      <div className="bg-white w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-2xl font-light text-charcoal-900">New Reservation</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form id="new-res-form" onSubmit={handleCreate}>
            <ReservationFormFields form={form} services={services} onChange={update} />
          </form>
        </div>
        <div className="px-6 py-4 border-t border-charcoal-100 flex gap-3 flex-shrink-0">
          <button type="submit" form="new-res-form" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Create Reservation'}</button>
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    </SafeModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [filter, setFilter] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [selectedMode, setSelectedMode] = useState<'view' | 'edit'>('view');
  const [showCompleted, setShowCompleted] = useState(false);

  const load = useCallback(async () => {
    try { const data = await getReservations(); setReservations(data); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    getAllServices().then(setServices);
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const openView = (r: any) => { setSelected(r); setSelectedMode('view'); };
  const openEdit = (r: any, e: React.MouseEvent) => { e.stopPropagation(); setSelected(r); setSelectedMode('edit'); };

  const activeReservations = reservations.filter(r => r.status !== 'COMPLETED');
  const completedReservations = reservations.filter(r => r.status === 'COMPLETED');
  const ACTIVE_FILTERS = ['ACTIVE', 'PENDING', 'ARRANGED', 'NOT_ARRANGED', 'CANCELLED'];
  const filtered = filter === 'ACTIVE' ? activeReservations : activeReservations.filter(r => r.status === filter);

  // Format a reservation's dateTime in DD/MM/YYYY HH:MM AM/PM
  const formatDT = (iso: string) => {
    const d = new Date(iso);
    if (!isValid(d)) return iso;
    const h24 = d.getHours();
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${format(d, 'dd/MM/yyyy')} ${String(h12).padStart(2, '0')}:${format(d, 'mm')} ${ampm}`;
  };

  const ReservationTable = ({ rows, emptyMsg }: { rows: any[]; emptyMsg: string }) => (
    <div className="bg-white border border-charcoal-100 overflow-hidden">
      {rows.length === 0 ? (
        <div className="p-12 text-center text-charcoal-400">{emptyMsg}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-charcoal-50 border-b border-charcoal-100">
              <tr>
                {['Guest', 'Service', 'Date & Time', 'Guests', 'Status', 'Staff', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs tracking-widest uppercase text-charcoal-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-50">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-charcoal-50/50 transition-colors cursor-pointer select-none" onDoubleClick={() => openView(r)}>
                  <td className="px-5 py-4 font-medium text-charcoal-900">{r.guestName}</td>
                  <td className="px-5 py-4 text-charcoal-600 max-w-[180px] truncate">{r.service?.name}</td>
                  <td className="px-5 py-4 text-charcoal-600 whitespace-nowrap">{formatDT(r.dateTime)}</td>
                  <td className="px-5 py-4 text-charcoal-600">{r.guestCount}</td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColors[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-5 py-4 text-charcoal-500 text-xs">{r.user?.name}</td>
                  <td className="px-5 py-4">
                    <button onClick={e => openEdit(r, e)} className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Concierge</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Reservations</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Reservation</button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {ACTIVE_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors ${filter === s ? 'bg-charcoal-900 text-white' : 'bg-white border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'}`}>
              {s === 'ACTIVE' ? `All Active (${activeReservations.length})` : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white border border-charcoal-100 p-12 text-center text-charcoal-400">Loading…</div>
        ) : (
          <ReservationTable rows={filtered} emptyMsg="No reservations found." />
        )}
      </div>

      {/* Completed — collapsible */}
      <div className="border border-charcoal-100 bg-white">
        <button onClick={() => setShowCompleted(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-charcoal-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xs tracking-widest uppercase text-charcoal-500 font-medium">Completed Reservations</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{completedReservations.length}</span>
          </div>
          <span className={`text-charcoal-400 transition-transform ${showCompleted ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {showCompleted && (
          <div className="border-t border-charcoal-100">
            <ReservationTable rows={completedReservations} emptyMsg="No completed reservations." />
          </div>
        )}
      </div>

      <p className="text-[11px] text-charcoal-400 text-center tracking-wide">
        Double-click a row to view details · Click Edit to modify
        {user?.role !== 'ADMIN' && ' · Only admins can delete reservations'}
      </p>

      {showNew && <NewReservationModal services={services} onClose={() => setShowNew(false)} onCreated={load} />}

      {selected && (
        <ReservationModal
          reservation={selected} services={services} mode={selectedMode}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); setSelected(null); }}
          onDeleted={() => { load(); setSelected(null); }}
          currentUser={user}
        />
      )}
    </div>
  );
}

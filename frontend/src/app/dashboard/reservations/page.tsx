'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { getReservations, deleteReservation, getAllServices, createReservation, updateReservation, getAuditLogs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { format, parse, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { useModalScrollLock } from '@/lib/useModalScrollLock';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a smart date string.
 * "221226"  → 22 Dec 2026
 * "22-12-26" / "22/12/26" / "22/12/2026" → same
 * Falls back to raw value for normal date pickers.
 */
function parseSmartDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 6) {
    // DDMMYY
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yy = digits.slice(4, 6);
    const year = parseInt(yy, 10) >= 50 ? `19${yy}` : `20${yy}`;
    const d = parse(`${dd}/${mm}/${year}`, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  if (digits.length === 8) {
    // DDMMYYYY
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    const d = parse(`${dd}/${mm}/${yyyy}`, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  return raw;
}

/**
 * Parse a smart time string.
 * "1525" → "15:25"
 * "525"  → "05:25"
 * "3:25 PM" → "15:25"
 */
function parseSmartTime(raw: string): string {
  const trimmed = raw.trim();
  // Already HH:MM
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed.padStart(5, '0');

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 3) {
    // e.g. "525" → 05:25
    return `0${digits[0]}:${digits.slice(1)}`;
  }
  if (digits.length === 4) {
    // "1525" → 15:25
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  return raw;
}

/** Build ISO string from separate date + time strings */
function buildISODateTime(date: string, time: string): string {
  const d = parseSmartDate(date);
  const t = parseSmartTime(time);
  return `${d}T${t}`;
}

/** Split an ISO/datetime-local string into { date, time } */
function splitDateTime(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const dt = new Date(iso);
  if (!isValid(dt)) {
    // Try splitting naively
    const [d, t] = iso.split('T');
    return { date: d || '', time: t ? t.slice(0, 5) : '' };
  }
  return {
    date: format(dt, 'yyyy-MM-dd'),
    time: format(dt, 'HH:mm'),
  };
}

// ─── types ────────────────────────────────────────────────────────────────────

interface ReservationForm {
  serviceId: string;
  guestName: string;
  guestCount: number;
  date: string;
  time: string;
  notes: string;
  totalPrice: string;
  currency: string;
  status: string;
}

const emptyForm: ReservationForm = {
  serviceId: '',
  guestName: '',
  guestCount: 1,
  date: '',
  time: '',
  notes: '',
  totalPrice: '',
  currency: 'EUR',
  status: 'PENDING',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ARRANGED: 'bg-green-100 text-green-800',
  NOT_ARRANGED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-charcoal-100 text-charcoal-600',
};

const actionColors: Record<string, string> = {
  CREATE: 'text-green-600',
  UPDATE: 'text-blue-600',
  DELETE: 'text-red-500',
};

// ─── Modal wrapper that fixes the click-outside / text-selection bug ──────────
/**
 * The standard pattern `onClick={closeModal}` on the backdrop fires on
 * mouseup, which means a drag-to-select that starts inside an input and ends
 * outside the modal incorrectly closes it.
 *
 * Fix: track mousedown position.  Only close if both mousedown AND mouseup
 * land on the backdrop itself (not on any child).
 */
function SafeModal({
  onClose,
  children,
  className = '',
}: {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${className}`}
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === backdropRef.current;
      }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdrop.current && e.target === backdropRef.current) {
          onClose();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      {children}
    </div>
  );
}

// ─── DateTimeInput ─────────────────────────────────────────────────────────────

function DateTimeInput({
  date,
  time,
  onDateChange,
  onTimeChange,
  required = false,
}: {
  date: string;
  time: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  required?: boolean;
}) {
  const [rawDate, setRawDate] = useState(date);
  const [rawTime, setRawTime] = useState(time);

  // Keep raw values in sync when parent resets the form
  useEffect(() => { setRawDate(date); }, [date]);
  useEffect(() => { setRawTime(time); }, [time]);

  const handleDateBlur = () => {
    const parsed = parseSmartDate(rawDate);
    setRawDate(parsed);
    onDateChange(parsed);
  };

  const handleTimeBlur = () => {
    const parsed = parseSmartTime(rawTime);
    setRawTime(parsed);
    onTimeChange(parsed);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Date <span className="text-red-400">*</span></label>
        <input
          type="date"
          required={required}
          value={rawDate}
          onChange={(e) => { setRawDate(e.target.value); onDateChange(e.target.value); }}
          onBlur={handleDateBlur}
          className="input-field"
          placeholder="DD-MM-YYYY"
        />
        <p className="text-[10px] text-charcoal-400 mt-0.5">e.g. 221226 → 22 Dec 2026</p>
      </div>
      <div>
        <label className="label">Time <span className="text-red-400">*</span></label>
        <input
          type="time"
          required={required}
          value={rawTime}
          onChange={(e) => { setRawTime(e.target.value); onTimeChange(e.target.value); }}
          onBlur={handleTimeBlur}
          className="input-field"
          placeholder="HH:MM"
        />
        <p className="text-[10px] text-charcoal-400 mt-0.5">e.g. 1525 → 15:25</p>
      </div>
    </div>
  );
}

// ─── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({
  reservationId,
  onClose,
}: {
  reservationId: string;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(reservationId)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [reservationId]);

  return (
    <SafeModal onClose={onClose}>
      <div
        className="bg-white w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-xl font-light text-charcoal-900">Change History</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {loading ? (
            <p className="text-charcoal-400 text-sm text-center py-6">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-charcoal-400 text-sm text-center py-6">No history yet.</p>
          ) : logs.map((log: any) => (
            <div key={log.id} className="border-l-2 border-charcoal-100 pl-3 py-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold ${actionColors[log.action] || 'text-charcoal-600'}`}>
                  {log.action}
                </span>
                <span className="text-[11px] text-charcoal-500">{log.user?.name}</span>
                <span className="text-[10px] text-charcoal-400 ml-auto">
                  {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
              {log.changes && typeof log.changes === 'object' && Object.keys(log.changes).length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {Object.entries(log.changes).map(([key, val]: [string, any]) => (
                    <div key={key} className="text-[10px] text-charcoal-500">
                      <span className="font-medium text-charcoal-700">{key}:</span>{' '}
                      {val?.before !== undefined ? (
                        <>
                          <span className="line-through text-red-400">{String(val.before ?? '—')}</span>
                          {' → '}
                          <span className="text-green-600">{String(val.after ?? '—')}</span>
                        </>
                      ) : (
                        <span>{String(val ?? '—')}</span>
                      )}
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

// ─── Detail / Edit Modal ───────────────────────────────────────────────────────

function ReservationModal({
  reservation,
  services,
  mode: initialMode,
  onClose,
  onSaved,
  onDeleted,
  currentUser,
}: {
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

  const { date: initDate, time: initTime } = splitDateTime(reservation.dateTime);

  const [form, setForm] = useState<ReservationForm>({
    serviceId: reservation.serviceId,
    guestName: reservation.guestName,
    guestCount: reservation.guestCount,
    date: initDate,
    time: initTime,
    notes: reservation.notes || '',
    totalPrice: reservation.totalPrice != null ? String(reservation.totalPrice) : '',
    currency: reservation.currency || 'EUR',
    status: reservation.status,
  });

  const setField = (key: keyof ReservationForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time) {
      toast.error('Date and time are both required');
      return;
    }
    setSaving(true);
    try {
      await updateReservation(reservation.id, {
        serviceId: form.serviceId,
        guestName: form.guestName,
        guestCount: Number(form.guestCount),
        dateTime: buildISODateTime(form.date, form.time),
        status: form.status,
        notes: form.notes,
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
        currency: form.currency,
      });
      toast.success('Reservation updated');
      onSaved();
      setMode('view');
    } catch {
      toast.error('Failed to update reservation');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this reservation?')) return;
    setDeleting(true);
    try {
      await deleteReservation(reservation.id);
      toast.success('Deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete =
    currentUser?.role === 'ADMIN' || reservation.userId === currentUser?.id;

  const serviceName =
    services.find((s) => s.id === reservation.serviceId)?.name ||
    reservation.service?.name ||
    '—';

  useModalScrollLock(true);

  return (
    <>
      <SafeModal onClose={onClose}>
        <div
          className="bg-white w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-0.5">Reservation</p>
              <h2 className="font-display text-2xl font-light text-charcoal-900">{reservation.guestName}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColors[reservation.status]}`}>
                {reservation.status}
              </span>
              <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
            </div>
          </div>

          {/* Action bar */}
          <div className="px-6 py-3 border-b border-charcoal-50 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
              className={`text-xs tracking-widest uppercase transition-colors ${mode === 'edit' ? 'text-gold-600 font-semibold' : 'text-gold-500 hover:text-gold-600'}`}
            >
              {mode === 'edit' ? '← View' : 'Edit'}
            </button>
            <span className="text-charcoal-200">|</span>
            <button
              onClick={() => setShowHistory(true)}
              className="text-xs tracking-widest uppercase text-charcoal-400 hover:text-charcoal-900 transition-colors"
            >
              History
            </button>
            {canDelete && (
              <>
                <span className="text-charcoal-200">|</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs tracking-widest uppercase text-red-400 hover:text-red-600 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {mode === 'view' ? (
              <div className="p-6 space-y-4">
                <Row label="Service" value={serviceName} />
                <Row label="Guest Name" value={reservation.guestName} />
                <Row label="Guests" value={String(reservation.guestCount)} />
                <Row
                  label="Date & Time"
                  value={isValid(new Date(reservation.dateTime))
                    ? format(new Date(reservation.dateTime), 'dd MMM yyyy — HH:mm')
                    : reservation.dateTime}
                />
                <Row label="Status" value={reservation.status} />
                {reservation.totalPrice != null && (
                  <Row label="Price" value={`${reservation.totalPrice} ${reservation.currency}`} />
                )}
                {reservation.notes && <Row label="Notes" value={reservation.notes} />}
                {reservation.user && <Row label="Created by" value={reservation.user.name} />}
              </div>
            ) : (
              <form id="res-edit-form" onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="label">Service</label>
                  <select
                    required
                    value={form.serviceId}
                    onChange={(e) => setField('serviceId', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select a service…</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.category?.name} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Guest Name</label>
                    <input
                      required
                      value={form.guestName}
                      onChange={(e) => setField('guestName', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">No. of Guests</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={form.guestCount}
                      onChange={(e) => setField('guestCount', Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                </div>
                <DateTimeInput
                  date={form.date}
                  time={form.time}
                  onDateChange={(v) => setField('date', v)}
                  onTimeChange={(v) => setField('time', v)}
                  required
                />
                <div>
                  <label className="label">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value)}
                    className="input-field"
                  >
                    <option>PENDING</option>
                    <option>ARRANGED</option>
                    <option>NOT_ARRANGED</option>
                    <option>CANCELLED</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Total Price</label>
                    <input
                      type="number"
                      value={form.totalPrice}
                      onChange={(e) => setField('totalPrice', e.target.value)}
                      className="input-field"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="label">Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => setField('currency', e.target.value)}
                      className="input-field"
                    >
                      <option>EUR</option>
                      <option>USD</option>
                      <option>SCR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    className="input-field resize-none"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          {mode === 'edit' && (
            <div className="px-6 py-4 border-t border-charcoal-100 flex gap-3 flex-shrink-0">
              <button
                type="submit"
                form="res-edit-form"
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setMode('view')}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </SafeModal>

      {showHistory && (
        <HistoryPanel
          reservationId={reservation.id}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-charcoal-50 last:border-0">
      <span className="text-xs tracking-widest uppercase text-charcoal-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-charcoal-900 text-right">{value}</span>
    </div>
  );
}

// ─── New Reservation Modal ────────────────────────────────────────────────────

function NewReservationModal({
  services,
  onClose,
  onCreated,
}: {
  services: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof ReservationForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time) {
      toast.error('Date and time are both required');
      return;
    }
    setSaving(true);
    try {
      await createReservation({
        serviceId: form.serviceId,
        guestName: form.guestName,
        guestCount: Number(form.guestCount),
        dateTime: buildISODateTime(form.date, form.time),
        notes: form.notes,
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
        currency: form.currency,
      });
      toast.success('Reservation created');
      onCreated();
      onClose();
    } catch {
      toast.error('Failed to create reservation');
    } finally {
      setSaving(false);
    }
  };

  useModalScrollLock(true);

  return (
    <SafeModal onClose={onClose}>
      <div
        className="bg-white w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-2xl font-light text-charcoal-900">New Reservation</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form id="new-res-form" onSubmit={handleCreate} className="p-6 space-y-4">
            <div>
              <label className="label">Service</label>
              <select
                required
                value={form.serviceId}
                onChange={(e) => setField('serviceId', e.target.value)}
                className="input-field"
              >
                <option value="">Select a service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.category?.name} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Guest Name</label>
                <input
                  required
                  value={form.guestName}
                  onChange={(e) => setField('guestName', e.target.value)}
                  className="input-field"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="label">No. of Guests</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.guestCount}
                  onChange={(e) => setField('guestCount', Number(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>
            <DateTimeInput
              date={form.date}
              time={form.time}
              onDateChange={(v) => setField('date', v)}
              onTimeChange={(v) => setField('time', v)}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Total Price</label>
                <input
                  type="number"
                  value={form.totalPrice}
                  onChange={(e) => setField('totalPrice', e.target.value)}
                  className="input-field"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="label">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value)}
                  className="input-field"
                >
                  <option>EUR</option>
                  <option>USD</option>
                  <option>SCR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                className="input-field resize-none"
                placeholder="Special requests, details…"
              />
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t border-charcoal-100 flex gap-3 flex-shrink-0">
          <button
            type="submit"
            form="new-res-form"
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving…' : 'Create Reservation'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
        </div>
      </div>
    </SafeModal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [selectedMode, setSelectedMode] = useState<'view' | 'edit'>('view');

  const load = useCallback(async () => {
    try {
      const data = await getReservations();
      setReservations(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getAllServices().then(setServices);

    // Task 1: real-time sync — poll every 30 seconds
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const openView = (r: any) => { setSelected(r); setSelectedMode('view'); };
  const openEdit = (r: any, e: React.MouseEvent) => { e.stopPropagation(); setSelected(r); setSelectedMode('edit'); };

  const filtered = filter === 'ALL' ? reservations : reservations.filter((r) => r.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Concierge</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Reservations</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          + New Reservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'PENDING', 'ARRANGED', 'NOT_ARRANGED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors ${
              filter === s
                ? 'bg-charcoal-900 text-white'
                : 'bg-white border border-charcoal-200 text-charcoal-600 hover:bg-charcoal-50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-charcoal-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-charcoal-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-charcoal-400">No reservations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-charcoal-50 border-b border-charcoal-100">
                <tr>
                  {['Guest', 'Service', 'Date & Time', 'Guests', 'Status', 'Staff', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs tracking-widest uppercase text-charcoal-500 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-charcoal-50/50 transition-colors cursor-pointer select-none"
                    onDoubleClick={() => openView(r)}
                    title="Double-click to view details"
                  >
                    <td className="px-5 py-4 font-medium text-charcoal-900">{r.guestName}</td>
                    <td className="px-5 py-4 text-charcoal-600 max-w-[180px] truncate">{r.service?.name}</td>
                    <td className="px-5 py-4 text-charcoal-600 whitespace-nowrap">
                      {isValid(new Date(r.dateTime))
                        ? format(new Date(r.dateTime), 'dd MMM yyyy HH:mm')
                        : r.dateTime}
                    </td>
                    <td className="px-5 py-4 text-charcoal-600">{r.guestCount}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${statusColors[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-charcoal-500 text-xs">{r.user?.name}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => openEdit(r, e)}
                          className="text-gold-500 hover:text-gold-600 text-xs tracking-widest uppercase"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-[11px] text-charcoal-400 text-center tracking-wide">
        Double-click a row to view details · Click Edit to modify
      </p>

      {/* New reservation modal */}
      {showNew && (
        <NewReservationModal
          services={services}
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}

      {/* View / edit modal */}
      {selected && (
        <ReservationModal
          reservation={selected}
          services={services}
          mode={selectedMode}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); setSelected(null); }}
          onDeleted={() => { load(); setSelected(null); }}
          currentUser={user}
        />
      )}
    </div>
  );
}

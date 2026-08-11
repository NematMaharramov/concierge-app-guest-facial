'use client';
import { useEffect, useState } from 'react';
import { getSendContext, getSuggestedEvents, previewLetter, sendLetter, getLetterHistory } from '@/lib/api';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';

const emptyGuest = { guestName: '', guestEmail: '', roomType: '', arrivalDate: '', departureDate: '', pmsReservationId: '' };

export default function PreArrivalLetterPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [context, setContext] = useState<{ templates: any[]; roomTypes: any[] } | null>(null);
  const [guest, setGuest] = useState<any>(emptyGuest);
  const [templateId, setTemplateId] = useState('');
  const [suggestedEvents, setSuggestedEvents] = useState<any[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    getSendContext().then(ctx => {
      setContext(ctx);
      const def = ctx.templates.find((t: any) => t.isDefault) || ctx.templates[0];
      if (def) setTemplateId(def.id);
    });
  }, []);

  const loadHistory = () => getLetterHistory().then(setHistory);

  const goToEvents = async () => {
    if (!guest.guestName || !guest.guestEmail || !guest.arrivalDate) {
      toast.error('Guest name, email, and arrival date are required'); return;
    }
    try {
      const events = await getSuggestedEvents(guest.arrivalDate, guest.departureDate || guest.arrivalDate);
      setSuggestedEvents(events);
      setSelectedEventIds([]);
      setStep(2);
    } catch { toast.error('Failed to load events'); }
  };

  const toggleEvent = (id: string) => setSelectedEventIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);

  const buildDto = () => ({
    templateId, ...guest,
    departureDate: guest.departureDate || undefined,
    pmsReservationId: guest.pmsReservationId || undefined,
    eventIds: selectedEventIds,
  });

  const goToPreview = async () => {
    if (!templateId) { toast.error('Select a template'); return; }
    setLoadingPreview(true);
    try {
      const result = await previewLetter(buildDto());
      setPreview(result);
      setEditedSubject(result.subject);
      setEditedHtml(result.html);
      setStep(4);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to build preview');
    } finally { setLoadingPreview(false); }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await sendLetter({
        ...buildDto(),
        overrideSubject: editedSubject !== preview?.subject ? editedSubject : undefined,
        overrideHtml: editedHtml !== preview?.html ? editedHtml : undefined,
      });
      toast.success(`Sent to ${guest.guestEmail}`);
      setGuest(emptyGuest); setStep(1); setPreview(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send — logged as failed, see History');
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Concierge</p>
          <h1 className="font-display text-3xl font-light text-charcoal-900">Pre-Arrival Letter</h1>
        </div>
        <button onClick={() => { setShowHistory(v => !v); if (!showHistory) loadHistory(); }} className="text-xs tracking-widest uppercase text-charcoal-400 hover:text-charcoal-900 transition-colors">
          {showHistory ? '← Back to Wizard' : 'History'}
        </button>
      </div>

      {showHistory ? (
        <div className="bg-white border border-charcoal-100 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center text-charcoal-400">No letters sent yet.</div>
          ) : (
            <div className="divide-y divide-charcoal-50">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">{h.guestName} <span className="text-charcoal-400 font-normal">· {h.guestEmail}</span></p>
                    <p className="text-xs text-charcoal-400">{h.template?.name} · sent by {h.sentBy?.name} · {isValid(new Date(h.sentAt)) ? format(new Date(h.sentAt), 'dd MMM yyyy HH:mm') : ''}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${h.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{h.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-charcoal-100">
          <div className="px-6 py-3 border-b border-charcoal-100 bg-charcoal-50">
            <p className="text-xs tracking-widest uppercase text-charcoal-500">Step {step} of 4</p>
          </div>

          {step === 1 && (
            <div className="p-6 space-y-4">
              <p className="text-xs text-charcoal-400">No PMS connection is required — enter guest details by hand.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Guest Name</label>
                  <input required value={guest.guestName} onChange={e => setGuest((g: any) => ({ ...g, guestName: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Guest Email</label>
                  <input required type="email" value={guest.guestEmail} onChange={e => setGuest((g: any) => ({ ...g, guestEmail: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Room Type</label>
                <select value={guest.roomType} onChange={e => setGuest((g: any) => ({ ...g, roomType: e.target.value }))} className="input-field">
                  <option value="">Select…</option>
                  {context?.roomTypes.map((rt: any) => <option key={rt.id} value={rt.roomTypeName}>{rt.roomTypeName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Arrival Date</label>
                  <input required type="date" value={guest.arrivalDate} onChange={e => setGuest((g: any) => ({ ...g, arrivalDate: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Departure Date <span className="text-charcoal-400 normal-case tracking-normal font-normal">(optional)</span></label>
                  <input type="date" value={guest.departureDate} onChange={e => setGuest((g: any) => ({ ...g, departureDate: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Reservation Reference <span className="text-charcoal-400 normal-case tracking-normal font-normal">(optional)</span></label>
                <input value={guest.pmsReservationId} onChange={e => setGuest((g: any) => ({ ...g, pmsReservationId: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="label">Template</label>
                <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="input-field">
                  {context?.templates.length === 0 && <option value="">No templates yet — create one in Letter Templates</option>}
                  {context?.templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button onClick={goToEvents} className="btn-primary w-full">Next: Suggested Events</button>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 space-y-4">
              <p className="text-xs text-charcoal-500">Events happening during this guest's stay — select any to include.</p>
              {suggestedEvents.length === 0 ? (
                <p className="text-xs text-charcoal-400 py-4">No events found for these dates.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {suggestedEvents.map(e => (
                    <label key={e.id} className="flex items-start gap-3 p-3 border border-charcoal-100 cursor-pointer">
                      <input type="checkbox" checked={selectedEventIds.includes(e.id)} onChange={() => toggleEvent(e.id)} className="mt-1 accent-gold-500" />
                      <div>
                        <p className="text-sm font-medium text-charcoal-900">{e.title}</p>
                        <p className="text-xs text-charcoal-400">{format(new Date(e.startDate), 'dd MMM')}{e.location ? ` · ${e.location}` : ''}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
                <button onClick={goToPreview} disabled={loadingPreview} className="btn-primary flex-1">{loadingPreview ? 'Building…' : 'Next: Preview'}</button>
              </div>
            </div>
          )}

          {step === 4 && preview && (
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Subject</label>
                <input value={editedSubject} onChange={e => setEditedSubject(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label mb-1">Body <span className="text-charcoal-400 normal-case tracking-normal font-normal">(edit freely before sending)</span></label>
                <textarea rows={10} value={editedHtml} onChange={e => setEditedHtml(e.target.value)} className="input-field resize-y font-mono text-xs" />
              </div>
              <div>
                <label className="label mb-1">Rendered Preview</label>
                <div className="border border-charcoal-100 p-4 max-h-56 overflow-y-auto text-sm" dangerouslySetInnerHTML={{ __html: editedHtml }} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-ghost flex-1">Back</button>
                <button onClick={handleSend} disabled={sending} className="btn-primary flex-1">{sending ? 'Sending…' : `Send to ${guest.guestEmail}`}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

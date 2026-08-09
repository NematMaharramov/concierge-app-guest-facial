'use client';
import { useEffect, useRef, useState } from 'react';
import { getImportCategories, previewImportFile, commitImport } from '@/lib/api';
import toast from 'react-hot-toast';

const BASE_FIELDS = [
  { key: 'name', label: 'Service Name' },
  { key: 'description', label: 'Description' },
  { key: 'priceInfo', label: 'Price Info (display text)' },
  { key: 'priceAmount', label: 'Price Amount (number)' },
  { key: 'priceCurrency', label: 'Currency' },
  { key: 'contactName', label: 'Contact Name' },
  { key: 'contactPhone', label: 'Contact Phone' },
];

interface Props {
  /** Only set when a SUPER_ADMIN is importing into a tenant that isn't
   * their own — an ADMIN always imports into their own tenant implicitly. */
  tenantId?: string;
  onClose: () => void;
  onImported?: () => void;
}

export function ExcelImportWizard({ tenantId, onClose, onImported }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [parsing, setParsing] = useState(false);

  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<'replace' | 'append'>('append');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getImportCategories(tenantId).then(setCategories).finally(() => setLoadingCategories(false));
  }, [tenantId]);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const fieldOptions = [
    ...BASE_FIELDS,
    ...(selectedCategory?.filterGroups || []).map((g: any) => ({ key: `filter:${g.id}`, label: `Filter: ${g.name}` })),
  ];

  const handleFileChange = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    setParsing(true);
    try {
      const data = await previewImportFile(f);
      setPreview(data);
      setMapping(data.suggestedMapping || {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not read this file');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const setColumnMapping = (idx: number, value: string) => {
    setMapping(m => ({ ...m, [idx]: value }));
  };

  const hasNameMapped = Object.values(mapping).includes('name');

  const handleCommit = async () => {
    if (!file || !categoryId) return;
    setImporting(true);
    try {
      const res = await commitImport({ file, categoryId, mapping, mode });
      setResult(res);
      toast.success(`Imported ${res.created} service(s)`);
      onImported?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-0.5">Import from Excel</p>
            <h2 className="font-display text-2xl font-light text-charcoal-900">Step {step} of 3</h2>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-900">✕</button>
        </div>

        {/* Step 1: choose category + upload file */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div>
              <label className="label">Target Category</label>
              {loadingCategories ? (
                <p className="text-xs text-charcoal-400">Loading categories…</p>
              ) : categories.length === 0 ? (
                <p className="text-xs text-charcoal-400">No categories exist yet for this tenant — create one first.</p>
              ) : (
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="input-field">
                  <option value="">Select a category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="label">Excel / CSV File</label>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => handleFileChange(e.target.files?.[0] || null)} />
              <button
                type="button"
                disabled={!categoryId}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-charcoal-300 hover:border-charcoal-500 text-charcoal-500 py-4 text-xs tracking-widest uppercase transition-colors disabled:opacity-40"
              >
                {parsing ? 'Reading file…' : file ? file.name : '+ Select File'}
              </button>
              <p className="text-[10px] text-charcoal-400 mt-1">.xlsx, .xls, or .csv — the first row must be column headers.</p>
            </div>

            {preview && (
              <div className="p-4 bg-charcoal-50 border border-charcoal-100 text-xs text-charcoal-600">
                Found <span className="font-medium">{preview.totalRows}</span> row(s) and{' '}
                <span className="font-medium">{preview.headers.length}</span> column(s).
              </div>
            )}

            <button
              type="button"
              disabled={!file || !categoryId || parsing}
              onClick={() => setStep(2)}
              className="btn-primary w-full disabled:opacity-40"
            >
              Next: Map Columns
            </button>
          </div>
        )}

        {/* Step 2: column mapping */}
        {step === 2 && preview && (
          <div className="p-6 space-y-4">
            <p className="text-xs text-charcoal-500">Match each column from your file to a field. Columns set to "Ignore" are skipped.</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.headers.map((header: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3 border border-charcoal-100 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">{header || `Column ${idx + 1}`}</p>
                    <p className="text-[10px] text-charcoal-400 truncate">
                      e.g. {String(preview.rows?.[0]?.[idx] ?? '—')}
                    </p>
                  </div>
                  <select
                    value={mapping[idx] || 'ignore'}
                    onChange={e => setColumnMapping(idx, e.target.value)}
                    className="input-field w-56 flex-shrink-0"
                  >
                    <option value="ignore">Ignore</option>
                    {fieldOptions.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!hasNameMapped && (
              <p className="text-xs text-red-500">At least one column must be mapped to "Service Name" to continue.</p>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
              <button type="button" disabled={!hasNameMapped} onClick={() => setStep(3)} className="btn-primary flex-1 disabled:opacity-40">
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: mode + confirm */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            {!result ? (
              <>
                <div>
                  <label className="label mb-2">Import Mode</label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border border-charcoal-100 cursor-pointer">
                      <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} className="mt-1 accent-gold-500" />
                      <div>
                        <p className="text-sm font-medium text-charcoal-900">Add to existing services</p>
                        <p className="text-xs text-charcoal-500">Keeps what's already in this category and adds the imported rows.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 border border-charcoal-100 cursor-pointer">
                      <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-1 accent-gold-500" />
                      <div>
                        <p className="text-sm font-medium text-charcoal-900">Replace all services in this category</p>
                        <p className="text-xs text-red-500">Deletes every existing service in "{selectedCategory?.name}" first — cannot be undone.</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="p-4 bg-charcoal-50 border border-charcoal-100 text-xs text-charcoal-600">
                  Importing <span className="font-medium">{preview?.totalRows}</span> row(s) into{' '}
                  <span className="font-medium">{selectedCategory?.name}</span>.
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-ghost flex-1">Back</button>
                  <button type="button" disabled={importing} onClick={handleCommit} className="btn-primary flex-1">
                    {importing ? 'Importing…' : 'Confirm Import'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 text-center bg-emerald-50 border border-emerald-100">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm text-charcoal-900 font-medium">{result.created} service(s) imported</p>
                  {result.skipped > 0 && <p className="text-xs text-charcoal-500 mt-1">{result.skipped} row(s) skipped (no name).</p>}
                </div>
                <button type="button" onClick={onClose} className="btn-primary w-full">Done</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

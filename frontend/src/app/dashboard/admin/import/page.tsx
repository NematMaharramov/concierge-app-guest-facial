'use client';
import { useState } from 'react';
import { ExcelImportWizard } from '@/components/ExcelImportWizard';

export default function AdminImportPage() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <p className="text-xs tracking-[0.4em] uppercase text-gold-500 mb-1">Admin</p>
        <h1 className="font-display text-3xl font-light text-charcoal-900">Import from Excel</h1>
      </div>

      <div className="bg-white border border-charcoal-100 p-6 space-y-4">
        <p className="text-sm text-charcoal-600 leading-relaxed">
          Upload a price sheet (.xlsx, .xls, or .csv) to add or replace services in one of your
          categories. You'll match each column to a field before anything is imported, and
          nothing is saved until you confirm.
        </p>
        <button onClick={() => setShowWizard(true)} className="btn-primary">+ Import from Excel</button>
      </div>

      {showWizard && <ExcelImportWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}

'use client';
import { useRef, useState } from 'react';
import { cropAndResize, CropOptions } from '@/lib/imageUtils';

interface Props {
  /** Label shown on the button */
  label?: string;
  /** Current image URL to preview (optional) */
  currentUrl?: string;
  /** Crop preset to apply before upload */
  cropOptions: CropOptions;
  /** Called with the cropped File, ready for upload */
  onFile: (file: File, previewUrl: string) => void;
  /** Show as square avatar style */
  avatar?: boolean;
  /** Extra class for the container */
  className?: string;
  disabled?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function resolveUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export function ImageUploadButton({
  label = 'Upload Image',
  currentUrl,
  cropOptions,
  onFile,
  avatar = false,
  className = '',
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(resolveUrl(currentUrl));
  const [processing, setProcessing] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const cropped = await cropAndResize(file, cropOptions);
      const url = URL.createObjectURL(cropped);
      setPreview(url);
      onFile(cropped, url);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setProcessing(false);
      // Reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (avatar) {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div
          className="w-20 h-20 rounded-full overflow-hidden bg-charcoal-100 border-2 border-charcoal-200 cursor-pointer relative group"
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-charcoal-400">👤</div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <span className="text-white text-xs">Change</span>
          </div>
          {processing && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
              <span className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={disabled} />
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          className="text-xs tracking-widest uppercase text-gold-500 hover:text-gold-600 transition-colors"
          disabled={disabled || processing}
        >
          {processing ? 'Processing…' : label}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {preview && (
        <div className="relative overflow-hidden border border-charcoal-200 bg-charcoal-50" style={{ aspectRatio: `${cropOptions.width}/${cropOptions.height}` }}>
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          {processing && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={disabled} />
      <button
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        className="w-full border border-dashed border-charcoal-300 hover:border-charcoal-500 text-charcoal-500 hover:text-charcoal-900 py-2.5 text-xs tracking-widest uppercase transition-colors"
        disabled={disabled || processing}
      >
        {processing ? 'Processing…' : preview ? `Replace ${label}` : `+ ${label}`}
      </button>
      <p className="text-[10px] text-charcoal-400">
        Image will be auto-cropped to {cropOptions.width}×{cropOptions.height}px
      </p>
    </div>
  );
}

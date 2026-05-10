'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, normalizeMediaUrl } from '@/services/api';
import { ImageIcon, X, Upload, ClipboardPaste } from 'lucide-react';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  label?: string;
};

export default function SlipUploadZone({ value, onChange, disabled, label = 'รูปสลิป (ไม่บังคับ)' }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('รองรับเฉพาะไฟล์รูปภาพเท่านั้น');
      return;
    }
    setUploading(true);
    try {
      const result = await api.uploadMedia(file);
      onChange(result.url);
    } catch {
      alert('อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  // Paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (disabled || uploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await uploadFile(file);
            break;
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [disabled, uploading, uploadFile]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) await uploadFile(file);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = '';
  };

  const slipSrc = value ? normalizeMediaUrl(value) : null;

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</div>}

      {slipSrc ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slipSrc}
            alt="สลิป"
            className="max-h-48 w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
          />
          <button
            onClick={() => onChange(null)}
            disabled={disabled}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <a
            href={slipSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full hover:bg-black/70 transition"
          >
            ขยาย
          </a>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
            px-4 py-6 cursor-pointer transition-all text-center
            ${dragOver
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/50'
            }
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">กำลังอัปโหลด...</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <div className="space-y-1">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">เลือกไฟล์</span>
                  {' '}หรือลากวาง
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                  <ClipboardPaste className="w-3 h-3" />
                  Ctrl+V เพื่อวางจากคลิปบอร์ด
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                  <Upload className="w-3 h-3" />
                  PNG, JPG สูงสุด 5MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled || uploading}
      />
    </div>
  );
}

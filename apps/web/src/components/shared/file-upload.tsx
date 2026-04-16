'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  label?: string;
  preview?: string | null;
}

export function FileUpload({
  onFileSelect,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  maxSizeMb = 5,
  label = 'Upload file',
  preview,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(
    (file: File) => {
      setError('');
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`File too large. Maximum ${maxSizeMb} MB.`);
        return;
      }
      setFileName(file.name);
      onFileSelect(file);
    },
    [maxSizeMb, onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        )}
      >
        {preview ? (
          <div className="relative">
            {preview.endsWith('.pdf') ? (
              <FileText className="h-16 w-16 text-muted-foreground" />
            ) : (
              <img src={preview} alt="Preview" className="max-h-48 rounded-md object-contain" />
            )}
          </div>
        ) : (
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        )}

        <p className="mb-1 text-sm font-medium">{fileName || label}</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Drag & drop or click to browse. Max {maxSizeMb} MB.
        </p>

        <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Browse Files
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

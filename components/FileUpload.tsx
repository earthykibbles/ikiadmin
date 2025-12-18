'use client';

import { CheckCircle2, FileAudio, FileText, FileVideo, Loader2, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  label?: string;
  className?: string;
  folder?: string;
  accept?: string;
  maxSizeMb?: number;
  kind?: 'audio' | 'video' | 'document' | 'generic';
}

function kindIcon(kind: FileUploadProps['kind']) {
  return kind === 'audio'
    ? FileAudio
    : kind === 'video'
      ? FileVideo
      : kind === 'document'
        ? FileText
        : Upload;
}

function dropZoneClass({
  uploading,
  hasValue,
  hasError,
}: {
  uploading: boolean;
  hasValue: boolean;
  hasError: boolean;
}) {
  const base = 'relative border-2 border-dashed rounded-xl transition-all';
  const state = uploading
    ? 'border-light-green/50 bg-light-green/5'
    : hasValue
      ? 'border-light-green/30 bg-iki-grey/20'
      : 'border-light-green/10 bg-iki-grey/10 hover:border-light-green/30 hover:bg-iki-grey/20';
  const err = hasError ? 'border-red-500/50' : '';
  return `${base} ${state} ${err}`;
}

function UploadError({ message }: { message: string }) {
  return (
    <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
      <p className="text-red-400 text-sm">{message}</p>
    </div>
  );
}

function UploadedFileView({
  url,
  fileName,
  uploading,
  kind,
  onRemove,
}: {
  url: string;
  fileName: string | null;
  uploading: boolean;
  kind: FileUploadProps['kind'];
  onRemove: () => void;
}) {
  const Icon = kindIcon(kind);
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-light-green/10 border border-light-green/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-light-green" />
          </div>
          <div className="min-w-0">
            <p className="text-iki-white text-sm font-medium truncate">
              {fileName || 'Uploaded file'}
            </p>
            <p className="text-iki-white/60 text-xs mt-1 truncate" title={url}>
              {url}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={uploading}
          className="p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors disabled:opacity-50"
          title="Remove"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>
      </div>

      {uploading ? (
        <div className="mt-3 flex items-center gap-2 text-iki-white/70 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-light-green" />
          Uploading...
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-light-green text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Uploaded successfully
        </div>
      )}
    </div>
  );
}

function EmptyFileView({
  inputId,
  accept,
  uploading,
  kind,
  maxSizeMb,
  fileInputRef,
  onChange,
}: {
  inputId: string;
  accept?: string;
  uploading: boolean;
  kind: FileUploadProps['kind'];
  maxSizeMb?: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const Icon = kindIcon(kind);
  const subtitle =
    kind === 'audio'
      ? 'Audio files'
      : kind === 'video'
        ? 'Video files'
        : kind === 'document'
          ? 'PDF / docs'
          : 'Supported files';

  return (
    <div className="p-8 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
        id={inputId}
        disabled={uploading}
      />
      <label htmlFor={inputId} className="cursor-pointer flex flex-col items-center gap-4">
        {uploading ? (
          <>
            <Loader2 className="w-12 h-12 text-light-green animate-spin" />
            <div>
              <p className="text-iki-white font-medium">Uploading...</p>
              <p className="text-iki-white/60 text-sm mt-1">Please wait</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-light-green/10 flex items-center justify-center border-2 border-light-green/30">
              <Icon className="w-8 h-8 text-light-green" />
            </div>
            <div>
              <p className="text-iki-white font-medium mb-1">Click to upload or drag and drop</p>
              <p className="text-iki-white/60 text-sm">
                {subtitle}
                {maxSizeMb ? ` (max ${maxSizeMb}MB)` : ''}
              </p>
            </div>
          </>
        )}
      </label>
    </div>
  );
}

export default function FileUpload({
  onUploadComplete,
  currentUrl,
  label = 'Upload File',
  className = '',
  folder,
  accept,
  maxSizeMb,
  kind = 'generic',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (maxSizeMb) {
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File size too large. Maximum size is ${maxSizeMb}MB.`);
        return;
      }
    }

    setFileName(file.name);
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folder', folder);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to upload file');
      }

      const data = await response.json();
      setUploadedUrl(data.url);
      onUploadComplete(data.url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      setUploadedUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedUrl(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploadComplete('');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const containerClass = dropZoneClass({
    uploading,
    hasValue: !!uploadedUrl,
    hasError: !!error,
  });

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-iki-white/80 mb-2">
          {label}
        </label>
      )}

      <div onDrop={handleDrop} onDragOver={handleDragOver} className={containerClass}>
        {uploadedUrl ? (
          <UploadedFileView
            url={uploadedUrl}
            fileName={fileName}
            uploading={uploading}
            kind={kind}
            onRemove={handleRemove}
          />
        ) : (
          <EmptyFileView
            inputId={inputId}
            accept={accept}
            uploading={uploading}
            kind={kind}
            maxSizeMb={maxSizeMb}
            fileInputRef={fileInputRef}
            onChange={handleFileSelect}
          />
        )}
      </div>

      {error ? <UploadError message={error} /> : null}
    </div>
  );
}




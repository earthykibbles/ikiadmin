'use client';

import { CheckCircle2, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  label?: string;
  className?: string;
  folder?: string;
}

export default function ImageUpload({
  onUploadComplete,
  currentUrl,
  label = 'Upload Image',
  className = '',
  folder,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please select an image file (JPEG, PNG, GIF, or WebP).');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 10MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      setUploadedUrl(data.url);
      onUploadComplete(data.url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setUploadedUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUploadComplete('');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-iki-white/80 mb-2">
          {label}
        </label>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`relative border-2 border-dashed rounded-xl transition-all ${
          uploading
            ? 'border-light-green/50 bg-light-green/5'
            : preview
              ? 'border-light-green/30 bg-iki-grey/20'
              : 'border-light-green/10 bg-iki-grey/10 hover:border-light-green/30 hover:bg-iki-grey/20'
        } ${error ? 'border-red-500/50' : ''}`}
      >
        {preview ? (
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-light-green animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">Uploading...</p>
                </div>
              </div>
            )}
            {uploadedUrl && !uploading && (
              <div className="absolute top-2 right-2">
                <div className="bg-green-500/90 rounded-full p-1.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="absolute top-2 left-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            {uploadedUrl && !uploading && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-xs text-white/90 truncate" title={uploadedUrl}>
                  ✓ Uploaded successfully
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id={inputId}
              disabled={uploading}
            />
            <label htmlFor={inputId} className="cursor-pointer flex flex-col items-center gap-4">
              {uploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-light-green animate-spin" />
                  <div>
                    <p className="text-iki-white font-medium">Uploading image...</p>
                    <p className="text-iki-white/60 text-sm mt-1">Please wait</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-light-green/10 flex items-center justify-center border-2 border-light-green/30">
                    <Upload className="w-8 h-8 text-light-green" />
                  </div>
                  <div>
                    <p className="text-iki-white font-medium mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-iki-white/60 text-sm">PNG, JPG, GIF, or WebP (max 10MB)</p>
                  </div>
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {uploadedUrl && !error && (
        <div className="mt-2 p-3 rounded-lg bg-light-green/10 border border-light-green/20">
          <p className="text-light-green text-sm font-medium mb-1">✓ Image uploaded successfully</p>
          <input
            type="text"
            value={uploadedUrl}
            readOnly
            className="w-full px-3 py-2 bg-iki-grey/30 border border-light-green/10 rounded-lg text-iki-white text-xs font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      )}
    </div>
  );
}

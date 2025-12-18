import { initFirebase } from '@/lib/firebase';
import admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

const VALID_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',

  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',

  // Video
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',

  // Documents (optional)
  'application/pdf',
]);

function bucketForUpload() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  return bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();
}

function maxSizeForMime(mime: string) {
  // Validate file size (type-specific limits)
  const maxImage = 10 * 1024 * 1024; // 10MB
  const maxAudio = 50 * 1024 * 1024; // 50MB
  const maxVideo = 200 * 1024 * 1024; // 200MB
  const maxPdf = 50 * 1024 * 1024; // 50MB

  if (mime.startsWith('image/')) return maxImage;
  if (mime.startsWith('audio/')) return maxAudio;
  if (mime.startsWith('video/')) return maxVideo;
  if (mime === 'application/pdf') return maxPdf;
  return maxImage;
}

function maxSizeError(mime: string) {
  if (mime.startsWith('video/')) return 'File size too large. Maximum video size is 200MB.';
  if (mime.startsWith('audio/')) return 'File size too large. Maximum audio size is 50MB.';
  if (mime === 'application/pdf') return 'File size too large. Maximum PDF size is 50MB.';
  return 'File size too large. Maximum image size is 10MB.';
}

function sanitizeFolder(folderRaw: string) {
  const folder = folderRaw
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '');
  return folder.length > 0 ? folder : 'connect';
}

export async function POST(request: NextRequest) {
  try {
    initFirebase();
    const bucket = bucketForUpload();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderRaw = (formData.get('folder') as string | null) ?? '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mime = (file.type || '').toLowerCase();

    if (!VALID_MIME_TYPES.has(mime)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: images, audio, video (and PDF).' },
        { status: 400 }
      );
    }

    const maxSize = maxSizeForMime(mime);

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: maxSizeError(mime),
        },
        { status: 400 }
      );
    }

    const safeFolder = sanitizeFolder(folderRaw);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${safeFolder}/${nanoid()}.${fileExtension}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Firebase Storage
    const fileRef = bucket.file(fileName);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          folder: safeFolder,
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
    });
  } catch (error: unknown) {
    console.error('Error uploading file:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload file';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

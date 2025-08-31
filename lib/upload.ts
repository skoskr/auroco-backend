// lib/upload.ts
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

interface UploadResult {
  success: boolean;
  filename?: string;
  url?: string;
  size?: number;
  error?: string;
}

interface FileData {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Upload dizinleri
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const IMAGE_DIR = path.join(UPLOAD_DIR, 'images');
const DOCUMENT_DIR = path.join(UPLOAD_DIR, 'documents');

// Dizinleri oluştur
async function ensureDirectories() {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    if (!existsSync(IMAGE_DIR)) {
      await mkdir(IMAGE_DIR, { recursive: true });
    }
    if (!existsSync(DOCUMENT_DIR)) {
      await mkdir(DOCUMENT_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Directory creation error:', error);
    throw new Error('Could not create upload directories');
  }
}

// Güvenli dosya adı oluştur
function generateSafeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  
  // Sadece harf, rakam ve tire kullan
  const safeName = originalName
    .replace(ext, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
  
  return `${safeName}-${timestamp}-${random}${ext}`;
}

// File type validation
function validateFileType(mimeType: string, category?: string): boolean {
  if (category === 'image') {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
  }
  if (category === 'document') {
    return ALLOWED_DOCUMENT_TYPES.includes(mimeType);
  }
  return ALL_ALLOWED_TYPES.includes(mimeType);
}

// File size validation
function validateFileSize(size: number, mimeType: string): boolean {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return size <= MAX_IMAGE_SIZE;
  }
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
    return size <= MAX_DOCUMENT_SIZE;
  }
  return false;
}

// Get upload directory based on file type
function getUploadDirectory(mimeType: string): string {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return IMAGE_DIR;
  }
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
    return DOCUMENT_DIR;
  }
  throw new Error('Unsupported file type');
}

// Get public URL path
function getPublicUrl(filename: string, mimeType: string): string {
  const subdir = ALLOWED_IMAGE_TYPES.includes(mimeType) ? 'images' : 'documents';
  return `/uploads/${subdir}/${filename}`;
}

// Ana upload fonksiyonu
export async function uploadFile(fileData: FileData, category?: string): Promise<UploadResult> {
  try {
    // Validations
    if (!validateFileType(fileData.type, category)) {
      return {
        success: false,
        error: `Desteklenmeyen dosya tipi: ${fileData.type}`
      };
    }

    if (!validateFileSize(fileData.size, fileData.type)) {
      const maxSize = ALLOWED_IMAGE_TYPES.includes(fileData.type) 
        ? MAX_IMAGE_SIZE / (1024 * 1024) 
        : MAX_DOCUMENT_SIZE / (1024 * 1024);
      return {
        success: false,
        error: `Dosya boyutu çok büyük. Maksimum: ${maxSize}MB`
      };
    }

    // Dizinleri oluştur
    await ensureDirectories();

    // Güvenli dosya adı oluştur
    const safeFilename = generateSafeFilename(fileData.name);
    
    // Upload dizini belirle
    const uploadDir = getUploadDirectory(fileData.type);
    const filePath = path.join(uploadDir, safeFilename);
    
    // Dosyayı kaydet
    await writeFile(filePath, fileData.buffer);
    
    // Public URL oluştur
    const publicUrl = getPublicUrl(safeFilename, fileData.type);

    return {
      success: true,
      filename: safeFilename,
      url: publicUrl,
      size: fileData.size
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

// FormData'dan file parse etme
export function parseFileFromFormData(formData: FormData, fieldName: string = 'file'): FileData | null {
  const file = formData.get(fieldName) as File;
  
  if (!file || !(file instanceof File)) {
    return null;
  }

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    buffer: Buffer.from(file.stream() as any) // Bu kısım runtime'da düzeltilecek
  };
}

// Multiple files upload
export async function uploadMultipleFiles(
  files: FileData[], 
  category?: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadFile(file, category);
    results.push(result);
  }
  
  return results;
}

// File delete fonksiyonu
export async function deleteFile(filename: string, mimeType: string): Promise<boolean> {
  try {
    const uploadDir = getUploadDirectory(mimeType);
    const filePath = path.join(uploadDir, filename);
    
    if (existsSync(filePath)) {
      await import('fs/promises').then(fs => fs.unlink(filePath));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
}

// File type helper
export function getFileCategory(mimeType: string): string {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
  return 'unknown';
}

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
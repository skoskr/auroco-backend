// lib/validations.ts - CMS için basitleştirilmiş
import { z } from 'zod';

// İletişim formu şemaları
export const contactFormSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir email adresi giriniz"),
  phone: z.string().optional(),
  company: z.string().optional(),
  service: z.string().min(1, "Hizmet seçimi zorunludur"),
  subService: z.string().optional(),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır")
});

// İçerik yönetimi şemaları
export const contentSchema = z.object({
  key: z.string().min(1, "İçerik anahtarı gereklidir"),
  title: z.string().min(1, "Başlık gereklidir"),
  content: z.string().min(1, "İçerik gereklidir"),
  locale: z.string().default("tr"),
  isActive: z.boolean().default(true)
});

// Dosya yükleme şeması
export const mediaUploadSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  alt: z.string().optional(),
  category: z.string().optional()
});

// Form durumu güncelleme
export const updateContactFormStatusSchema = z.object({
  status: z.enum(["NEW", "REVIEWED", "RESPONDED", "CLOSED"])
});

// Helper function - validation error'ları format etme
export function formatZodError(error: z.ZodError) {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }));
}
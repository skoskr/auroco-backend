// lib/validations.ts
import { z } from 'zod';

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string()
    .min(8, "Şifre en az 8 karakter olmalıdır")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Şifre en az 1 küçük harf, 1 büyük harf ve 1 rakam içermelidir"),
  name: z.string().min(1).optional(),
  orgName: z.string().min(1).optional()
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(1, "Şifre gereklidir")
});

// User schemas
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).nullable().optional(),
}).strict(); // Sadece tanımlı alanları kabul et

// Organization schemas
export const createOrgSchema = z.object({
  name: z.string()
    .min(1, "Organizasyon adı gereklidir")
    .max(100, "Organizasyon adı çok uzun")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Organizasyon adı sadece harf, rakam, boşluk, tire ve alt çizgi içerebilir")
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional()
}).strict();

// Member schemas
export const inviteMemberSchema = z.object({
  email: z.string().email("Geçerli bir email adresi giriniz"),
  role: z.string().refine((val) => ["ADMIN", "MEMBER"].includes(val), {
    message: "Role ADMIN veya MEMBER olmalıdır"
  })
});

export const updateMemberRoleSchema = z.object({
  role: z.string().refine((val) => ["OWNER", "ADMIN", "MEMBER"].includes(val), {
    message: "Role OWNER, ADMIN veya MEMBER olmalıdır"
  })
});

// Helper function - validation error'ları format etme
export function formatZodError(error: z.ZodError) {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }));
}
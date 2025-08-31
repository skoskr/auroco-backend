# Auroco CMS - Backend Sistemi

## 📋 Proje Özeti

**Teknoloji Stack:**
- **Backend:** Next.js 15.5.0 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Email:** Nodemailer SMTP
- **Validation:** Zod
- **Language:** TypeScript

## 🏗️ Proje Mimarisi

### Database Schema (Prisma)
```prisma
// CMS Modelleri:
- ContactForm (iletişim formu gönderimler)
- Content (sayfa içerikleri - çok dilli)
- Media (dosya yükleme sistemi)
- SystemLog (sistem logları)
```

### API Endpoints Yapısı
```
/api/
├── contact/             # İletişim formu (POST, GET)
├── content/             # İçerik yönetimi (GET, POST, PUT, DELETE)
├── media/               # Dosya yükleme (GET, POST, DELETE)
├── admin/               # Admin dashboard (istatistikler, loglar)
└── health/              # Sistem durumu kontrolü
```

## 🎯 Site Yapısı

### İçerik Yönetimi
- Çok dilli destek (TR/EN)
- Dinamik sayfa içerikleri
- SEO dostu yapı

## 🔧 Sistem Özellikleri

### 1. İletişim Formu Sistemi
- Form gönderimi ve database'e kayıt
- Admin'e email bildirimi
- Müşteriye otomatik yanıt
- Status takibi (NEW, REVIEWED, RESPONDED, CLOSED)

### 2. İçerik Yönetimi
- Key-based content system
- Multi-language support
- CRUD operations via API
- Content versioning

### 3. Medya Yönetimi
- Güvenli dosya yükleme
- Image ve document desteği
- File validation ve size limits
- Otomatik kategorileme

### 4. Admin Dashboard
- İstatistiksel raporlar
- İletişim formu yönetimi
- Sistem log takibi
- Media library yönetimi

## 📁 Dosya Yapısı

```
auroco-cms/
├── app/
│   ├── api/              # API endpoints
│   │   ├── admin/        # Admin dashboard
│   │   ├── contact/      # İletişim formu
│   │   ├── content/      # İçerik yönetimi
│   │   ├── health/       # Health check
│   │   └── media/        # Dosya yükleme
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Ana sayfa
├── lib/
│   ├── email.ts          # Email servisi
│   ├── prisma.ts         # Database client
│   ├── upload.ts         # File upload logic
│   └── validations.ts    # Zod schemas
├── prisma/
│   └── schema.prisma     # Database schema
├── public/
│   └── uploads/          # Yüklenen dosyalar
├── middleware.ts         # Security middleware
├── next.config.ts        # Next.js config
└── package.json          # Dependencies
```

## 🔒 Güvenlik Özellikleri

### Input Security
- SQL injection koruması (Prisma ORM)
- XSS koruması (input validation)
- File upload güvenliği
- MIME type validation

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN (3D modeller için)
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Admin Protection
- IP-based access control (production)
- Development ortamında bypass
- Protected admin endpoints

## 🚀 Kurulum ve Çalıştırma

### Environment Variables
```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASS="your-password"
ADMIN_EMAIL="your-admin@email.com"
```

### Çalıştırma
```bash
# Dependencies yükle
npm install

# Database setup
npx prisma db push

# Development server
npm run dev

# Production build
npm run build
npm start
```

## 📊 API Kullanımı

### İletişim Formu
```javascript
// POST /api/contact
{
  "name": "John Doe",
  "email": "john@example.com",
  "service": "Akademi",
  "message": "Eğitim programları hakkında bilgi istiyorum"
}
```

### İçerik Yönetimi
```javascript
// GET /api/content?key=homepage_hero_title&locale=tr
// POST /api/content
{
  "key": "about_title",
  "title": "Hakkımızda Başlık",
  "content": "Şirket hakkında bilgiler...",
  "locale": "tr"
}
```

### Dosya Yükleme
```javascript
// POST /api/media
FormData: {
  file: [File],
  category: "logo",
  alt: "Company logo"
}
```

## 📈 Performans Özellikleri

### Database Optimizations
- Optimized indexing strategy
- Efficient query patterns
- Connection pooling

### File Management
- Organized upload directories
- File size validation
- MIME type restrictions

### Caching Strategy
- Static asset optimization
- Image optimization (WebP, AVIF)
- Server-side rendering

## 🧪 Test Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Contact form
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","service":"Akademi","message":"Test mesajı"}'

# Content API
curl http://localhost:3000/api/content?locale=tr
```

## 🔄 Maintenance

### Log Monitoring
- System logs via /api/admin?action=system-logs
- Email delivery tracking
- File upload logs

### Content Updates
- Dynamic content via CMS API
- Multi-language content support
- Version control ready

### Backup Strategy
- Database regular backups
- Uploaded files backup
- Configuration backup

## 🎯 Production Readiness

**System Status: Production Ready ✅**

### Deployed Features
- Secure file upload system
- Email notification system
- Admin dashboard
- Content management
- Health monitoring

### Security Checklist
- ✅ Input validation
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ File upload security
- ✅ Admin access control

### Performance Checklist
- ✅ Database indexing
- ✅ Image optimization
- ✅ Gzip compression
- ✅ Static asset optimization

---

**Site Tipi:** Kurumsal CMS + 3D Interactive  
**Son Güncelleme:** Ocak 2025  
**Versiyon:** 1.0.0  
**Durum:** Production Ready# auroco-backend

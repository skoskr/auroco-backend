// middleware.ts - Basitleştirilmiş CMS için
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Security headers (tüm response'lara ekle)
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // 3D modeller için
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // API routes için basit kontroller
  if (pathname.startsWith('/api/')) {
    
    // Public API routes (herkes erişebilir)
    const publicRoutes = [
      '/api/health',
      '/api/contact', // İletişim formu public
      '/api/content'  // İçerik okuma public
    ];

    // Public route kontrolü
    const isPublicRoute = publicRoutes.some(route => 
      pathname.startsWith(route)
    );

    if (isPublicRoute) {
      return response;
    }

    // Admin routes (/api/admin, /api/media) için basit IP kontrolü
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/media')) {
      
      // Development ortamında tüm IP'lere izin ver
      if (process.env.NODE_ENV === 'development') {
        return response;
      }

      // Production'da admin IP'leri kontrol et (opsiyonel)
      const adminIPs = process.env.ADMIN_IPS?.split(',') || [];
      const clientIP = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';

      if (adminIPs.length > 0 && !adminIPs.includes(clientIP)) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Rate limiting için header ekle (basit)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    response.headers.set('x-client-ip', clientIP);
  }

  // Static dosyalar ve diğer route'lar için normal akış
  return response;
}

export const config = {
  matcher: [
    // API routes için
    '/api/((?!_next/static|_next/image|favicon.ico).*)',
    // Yüklenen dosyalar için
    '/uploads/:path*'
  ]
};
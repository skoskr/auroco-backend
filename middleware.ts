// middleware.ts - Root seviyesinde oluşturun
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // CORS headers ekle (tüm response'lara)
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // API routes için middleware
  if (pathname.startsWith('/api/')) {
    
    // Public API routes - authentication gerektirmez
    const publicRoutes = [
      '/api/health',
      '/api/auth/signin', 
      '/api/auth/signup',
      '/api/auth/session',
      '/api/auth/csrf',
      '/api/auth/providers',
      '/api/auth/callback'
    ];

    // Public route kontrolü
    const isPublicRoute = publicRoutes.some(route => 
      pathname.startsWith(route)
    );

    if (isPublicRoute) {
      return response;
    }

    // JWT token kontrolü (protected routes için)
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });

      if (!token || !token.id) {
        return NextResponse.json(
          { 
            error: 'Unauthorized',
            message: 'Valid authentication token required'
          },
          { status: 401 }
        );
      }

      // Token bilgilerini header'a ekle (route'larda kullanım için)
      response.headers.set('x-user-id', token.id as string);
      if (token.currentOrgId) {
        response.headers.set('x-current-org-id', token.currentOrgId as string);
      }

    } catch (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  }

  // Frontend route protection
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/org')) {
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });

      if (!token) {
        // Redirect to signin with return URL
        const signInUrl = new URL('/signin', request.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
      }

    } catch (error) {
      console.error('Frontend middleware error:', error);
      return NextResponse.redirect(new URL('/signin', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // API routes (auth routes hariç)
    '/api/((?!auth|health|_next/static|_next/image|favicon.ico).*)',
    // Protected frontend routes
    '/dashboard/:path*',
    '/org/:path*'
  ]
};
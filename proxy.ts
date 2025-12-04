import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './lib/auth';

export async function proxy(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication with timeout to prevent hanging
  try {
    // Add a timeout to prevent middleware from hanging on slow DB queries
    const sessionPromise = auth.api.getSession({ headers: request.headers });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 5000)
    );
    
    const session = await Promise.race([sessionPromise, timeoutPromise]) as any;
    
    if (!session?.user) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if accessing superadmin page
    if (request.nextUrl.pathname.startsWith('/superadmin')) {
      // Verify user is superadmin
      const response = await fetch(new URL('/api/admin/check-role', request.url), {
        headers: request.headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.role !== 'superadmin') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      } else {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch (error: any) {
    // Log error for debugging
    const errorMessage = error?.message || String(error);
    console.error('Proxy auth error:', {
      message: errorMessage,
      pathname: request.nextUrl.pathname,
    });
    
    // If it's a database/query error or timeout, allow through
    // Route handlers will check authentication, preventing complete lockout
    // This is a trade-off: better UX vs strict security in middleware
    if (
      errorMessage.includes('Failed query') || 
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNREFUSED')
    ) {
      console.warn('Allowing request through due to database error - route handlers will verify auth');
      return NextResponse.next();
    }
    
    // For other errors (like invalid token format), redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


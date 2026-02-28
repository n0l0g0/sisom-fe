import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'th'],
  defaultLocale: 'th',
  localePrefix: 'always'
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Normalize path by removing locale prefix for auth checking
  // e.g. /th/login -> /login, /en/dashboard -> /dashboard
  const pathWithoutLocale = pathname.replace(/^\/(en|th)/, '') || '/';

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/floor-plan', '/meter', '/gallery'];
  const isPublicPath = publicPaths.some(path => pathWithoutLocale.startsWith(path));

  // Get token
  const token = request.cookies.get('sisom_token')?.value;

  // Determine current locale from path or default to 'th'
  const locale = pathname.match(/^\/(en|th)/)?.[1] || 'th';

  // 1. Protected Route Check: No token & trying to access protected route
  if (!token && !isPublicPath) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // loginUrl.searchParams.set('from', pathname); // Optional: preserve redirect
    return NextResponse.redirect(loginUrl);
  }

  // 2. Auth Page Check: Has token & trying to access login
  if (token && pathWithoutLocale === '/login') {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // 3. Let next-intl handle localization (redirects, rewriting, etc.)
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};

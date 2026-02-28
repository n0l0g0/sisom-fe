'use client';

import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  // Adjust logic to handle locale prefix
  // pathname might be /th/login or /en/login
  const pathWithoutLocale = pathname.replace(/^\/(en|th)/, '') || '/';
  
  const isLoginPage = pathWithoutLocale === '/login';
  const isPrintPage =
    pathWithoutLocale.includes('/print') ||
    pathWithoutLocale.startsWith('/reports/dorm-summary') ||
    pathWithoutLocale.startsWith('/bills/arrears-summary');
  const isGalleryPage = pathWithoutLocale === '/gallery';
  const isMeterPage = pathWithoutLocale === '/meter';
  const isPublicPage = isLoginPage || isGalleryPage || isMeterPage;
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      document.title = 'SISOM CMS';
      const cookies = document.cookie || '';
      const hasToken = cookies.split(';').map((s) => s.trim()).some((s) => s.startsWith('sisom_token='));
      const hasUser = !!window.localStorage.getItem('sisom_user');
      
      if (isLoginPage) {
        if (hasToken && hasUser) {
          router.replace('/');
        }
        return;
      }
      if (isPublicPage) {
        return;
      }
      if (!hasToken || !hasUser) {
        // router.replace('/login');
        return;
      }
      
      if (pathWithoutLocale === '/') {
        const ua = navigator.userAgent || '';
        const isLineApp = /Line/i.test(ua);
        if (isLineApp) {
          router.replace('/meter');
          return;
        }
      }
    } catch {
      if (!isLoginPage && !isGalleryPage) {
        router.replace('/login');
      }
    }
  }, [isLoginPage, isPublicPage, isGalleryPage, isMeterPage, pathWithoutLocale, router]);

  return (
    <body
      className={`font-sans antialiased ${
        isPrintPage || isGalleryPage || isMeterPage ? 'bg-white dark:bg-slate-950' : 'bg-background'
      }`}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {isPrintPage || isGalleryPage ? (
          <main className="min-h-screen">{children}</main>
        ) : (
          <div className="flex h-screen overflow-hidden">
            {!isLoginPage && (
              <div className={isMeterPage ? 'hidden md:block' : ''}>
                <Sidebar
                  isCollapsed={isCollapsed}
                  toggleSidebar={() => setIsCollapsed(!isCollapsed)}
                />
              </div>
            )}
            {(() => {
              let mainMarginClass = '';
              if (!isLoginPage) {
                if (isMeterPage) {
                  mainMarginClass = isCollapsed ? 'md:ml-20' : 'md:ml-64';
                } else {
                  mainMarginClass = isCollapsed ? 'ml-20' : 'ml-64';
                }
              }
              return (
              <main
                className={`flex-1 overflow-y-auto bg-background transition-all duration-300 ${
                  mainMarginClass
                }`}
              >
                {!isLoginPage && (
                  <div className="sticky top-0 z-30 flex justify-end px-6 py-4 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-full shadow-sm p-1">
                      <ThemeToggle />
                      <NotificationBell />
                    </div>
                  </div>
                )}
                <div className="p-6 pt-0">
                  {children}
                </div>
              </main>
              );
            })()}
          </div>
        )}
      </ThemeProvider>
    </body>
  );
}

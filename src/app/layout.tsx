'use client';

import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const isPrintPage =
    pathname.includes('/print') ||
    pathname.startsWith('/reports/dorm-summary') ||
    pathname.startsWith('/bills/arrears-summary');
  const isGalleryPage = pathname === '/gallery';
  const isMeterPage = pathname === '/meter';
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
        router.replace('/login');
        return;
      }
      if (pathname === '/') {
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
  }, [isLoginPage, isPublicPage, isGalleryPage, isMeterPage, pathname, router]);

  return (
    <html lang="th">
      <body
        className={`font-sans antialiased ${
          isPrintPage || isGalleryPage || isMeterPage ? 'bg-white' : 'bg-slate-100'
        }`}
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
              className={`flex-1 overflow-y-auto bg-slate-100 p-6 transition-all duration-300 ${
                mainMarginClass
              }`}
            >
              {children}
            </main>
              );
            })()}
          </div>
        )}
      </body>
    </html>
  );
}

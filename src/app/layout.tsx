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
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cookies = document.cookie || '';
      const hasToken = cookies.split(';').map((s) => s.trim()).some((s) => s.startsWith('sisom_token='));
      const hasUser = !!window.localStorage.getItem('sisom_user');
      if (isLoginPage) {
        if (hasToken && hasUser) {
          router.replace('/');
        }
        return;
      }
      if (!hasToken || !hasUser) {
        router.replace('/login');
        return;
      }
    } catch {
      if (!isLoginPage) {
        router.replace('/login');
      }
    }
  }, [isLoginPage, router]);

  return (
    <html lang="th">
      <body className="font-sans antialiased bg-slate-100">
        <div className="flex h-screen overflow-hidden">
          {!isLoginPage && (
            <Sidebar 
              isCollapsed={isCollapsed} 
              toggleSidebar={() => setIsCollapsed(!isCollapsed)} 
            />
          )}
          <main 
            className={`flex-1 overflow-y-auto bg-slate-100 p-6 transition-all duration-300 ${
              !isLoginPage ? (isCollapsed ? 'ml-20' : 'ml-64') : ''
            }`}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

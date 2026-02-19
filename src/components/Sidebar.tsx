'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User } from '@/services/api';

const MENU_ITEMS = [
  { 
    id: 'dashboard', 
    href: '/', 
    label: 'แดชบอร์ด', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
      </svg>
    )
  },
  { 
    id: 'floor_plan', 
    href: '/floor-plan', 
    label: 'ผังหอพัก',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
    )
  },
  { 
    id: 'meter', 
    href: '/meter', 
    label: 'จดมิเตอร์',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
    )
  },
  { 
    id: 'bills', 
    href: '/bills', 
    label: 'บิลค่าเช่า',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
      </svg>
    )
  },
  { 
    id: 'payments', 
    href: '/payments', 
    label: 'จ่ายบิล',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
    )
  },
  { 
    id: 'contracts', 
    href: '/contracts', 
    label: 'สัญญาเช่า',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    )
  },
  { 
    id: 'reports', 
    href: '/reports', 
    label: 'รายงานสรุป',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    )
  },
  { 
    id: 'maintenance', 
    href: '/maintenance', 
    label: 'แจ้งซ่อม',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    )
  },
  { 
    id: 'former_tenants', 
    href: '/former-tenants', 
    label: 'ผู้เช่าเก่า',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    )
  },
];

const SETTINGS_ITEMS = [
  { id: 'settings_dorm', href: '/settings/dorm', label: 'ข้อมูลหอพัก' },
  { id: 'settings_rent', href: '/settings/rent', label: 'ค่าเช่ารายเดือน' },
  { id: 'settings_backups', href: '/settings/backups', label: 'สำรองข้อมูล' },
  { id: 'settings_users', href: '/settings/users', label: 'จัดการผู้ใช้' },
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const isActive = (path: string) => pathname === path;
  const isSettingsActive = pathname.startsWith('/settings');

  useEffect(() => {
    // Check for logged in user
    const userStr = localStorage.getItem('sisom_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, []);

  const handleLogout = () => {
    document.cookie = 'sisom_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('sisom_user');
    window.location.href = '/login';
  };

  const hasPermission = (id: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'OWNER') return true;
    return currentUser.permissions?.includes(id);
  };

  if (pathname === '/login') return null; // Don't show sidebar on login page

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} text-white flex flex-col h-screen fixed left-0 top-0 sidebar-gradient z-50 transition-all duration-300`}>
      <div className="p-4 border-b border-white/10 relative">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-semibold text-sm">ระบบบริหารจัดการหอพัก</h1>
              <p className="text-xs text-white/60">Admin</p>
            </div>
          )}
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={toggleSidebar}
          className={`absolute ${isCollapsed ? 'bottom-[-12px] left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20' : 'right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded'}`}
        >
          {isCollapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <div className="px-3 space-y-1">
          {MENU_ITEMS.map(item => hasPermission(item.id) && (
            <Link 
              key={item.id}
              href={item.href} 
              title={isCollapsed ? item.label : ''}
              className={`sidebar-item w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg ${isActive(item.href) ? 'active' : ''}`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {!isCollapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
            </Link>
          ))}

          {/* Settings with submenu */}
          {(hasPermission('settings_dorm') || hasPermission('settings_rent') || hasPermission('settings_users')) && (
            <div>
              <button 
                onClick={() => {
                  if (isCollapsed) toggleSidebar();
                  setIsSettingsOpen(!isSettingsOpen);
                }}
                title={isCollapsed ? 'ตั้งค่าระบบ' : ''}
                className={`sidebar-item w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-lg text-left ${isSettingsActive ? 'active' : ''}`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  {!isCollapsed && <span className="text-sm whitespace-nowrap">ตั้งค่าระบบ</span>}
                </div>
                {!isCollapsed && (
                  <svg className={`w-4 h-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                )}
              </button>
              
              {/* Only show submenu if not collapsed (or handled by expanding) */}
              {(!isCollapsed && (isSettingsOpen || isSettingsActive)) && (
                <div className="ml-9 mt-1 space-y-1">
                  {SETTINGS_ITEMS.map(item => hasPermission(item.id) && (
                    <Link 
                      key={item.id}
                      href={item.href} 
                      className={`block px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 ${isActive(item.href) ? 'bg-white/10 text-white' : ''}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-white/10">
        {currentUser ? (
          <div className="flex flex-col gap-2">
            {!isCollapsed && (
              <div className="text-xs text-white/70 whitespace-nowrap overflow-hidden text-ellipsis">
                Logged in as: <span className="font-semibold text-white">{currentUser.username}</span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              title={isCollapsed ? 'Logout' : ''}
              className={`w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs py-2 px-3 rounded flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} transition-colors`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        ) : (
          <Link 
            href="/login"
            title={isCollapsed ? 'Login' : ''}
            className={`w-full bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-3 rounded flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} transition-colors`}
          >
            {!isCollapsed && <span>Login</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}

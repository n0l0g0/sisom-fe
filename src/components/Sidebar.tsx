'use client';

import { Link, usePathname, useRouter } from '../navigation';
import { useState, useEffect } from 'react';
import { User, api } from '@/services/api';
import { useTranslations } from 'next-intl';

const MENU_ITEMS = [
  { 
    id: 'dashboard', 
    href: '/', 
    labelKey: 'Sidebar.dashboard', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
      </svg>
    )
  },
  { 
    id: 'chats', 
    href: '/chats', 
    labelKey: 'Sidebar.chats',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h8M8 14h5m7-10H6a2 2 0 00-2 2v12l4-4h12a2 2 0 002-2V6a2 2 0 00-2-2z"/>
      </svg>
    )
  },
  { 
    id: 'floor_plan', 
    href: '/floor-plan', 
    labelKey: 'Sidebar.floor_plan',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
    )
  },
  { 
    id: 'meter', 
    href: '/meter', 
    labelKey: 'Sidebar.meter',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
    )
  },
  { 
    id: 'bills', 
    href: '/bills', 
    labelKey: 'Sidebar.bills',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
      </svg>
    )
  },
  { 
    id: 'payments', 
    href: '/payments', 
    labelKey: 'Sidebar.payments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
    )
  },
  { 
    id: 'contracts', 
    href: '/contracts', 
    labelKey: 'Sidebar.contracts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    )
  },
  { 
    id: 'reports', 
    href: '/reports', 
    labelKey: 'Sidebar.reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    )
  },
  { 
    id: 'maintenance', 
    href: '/maintenance', 
    labelKey: 'Sidebar.maintenance',
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
    labelKey: 'Sidebar.former_tenants',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    )
  },
  { 
    id: 'activity_logs', 
    href: '/activity-logs', 
    labelKey: 'Sidebar.activity_logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-7a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    )
  },
];

const SETTINGS_ITEMS = [
  { id: 'settings_dorm', href: '/settings/dorm', labelKey: 'Sidebar.dorm_settings' },
  { id: 'settings_rent', href: '/settings/rent', labelKey: 'Sidebar.rent_settings' },
  { id: 'settings_backups', href: '/settings/backups', labelKey: 'Sidebar.backup_settings' },
  { id: 'settings_users', href: '/settings/users', labelKey: 'Sidebar.user_settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
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
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, []);

  const handleLogout = () => {
    document.cookie = 'sisom_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('sisom_user');
    window.location.href = '/login'; // Use standard href to force full reload and clear state
  };

  const hasPermission = (id: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'OWNER') return true;
    return currentUser.permissions?.includes(id);
  };

  if (pathname === '/login') return null; // Don't show sidebar on login page

  const toggleLanguage = () => {
    // Assuming next-intl/navigation router handles locale change
    // We can just switch locale. But need to know current.
    // Current is handled by next-intl provider context, but how to get it?
    // useLocale() hook.
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 shadow-sm`}>
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border relative">
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-semibold text-sm text-foreground">Sisom Manager</h1>
              <p className="text-xs text-muted-foreground">Pro Dashboard</p>
            </div>
          )}
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={toggleSidebar}
          className={`absolute ${isCollapsed ? 'bottom-[-12px] left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border border-sidebar-border rounded-full flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground shadow-sm' : 'right-[-12px] top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border border-sidebar-border rounded-full flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground shadow-sm z-10'}`}
        >
          {isCollapsed ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
      
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {MENU_ITEMS.map(item => hasPermission(item.id) && (
          <Link 
            key={item.id}
            href={item.href} 
            title={isCollapsed ? t(item.labelKey) : ''}
            className={`group w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-md transition-all duration-200 ${isActive(item.href) ? 'bg-sidebar-accent text-primary font-medium' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'}`}
            onClick={() => {
              try {
                api.createActivityLog({
                  action: 'CLICK',
                  path: item.href,
                  userId: currentUser?.id,
                  username: currentUser?.username,
                }).catch(() => {});
              } catch {}
            }}
          >
            <div className={`flex-shrink-0 transition-colors ${isActive(item.href) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>{item.icon}</div>
            {!isCollapsed && <span className="text-sm whitespace-nowrap">{t(item.labelKey)}</span>}
          </Link>
        ))}

        {/* Settings with submenu */}
        {(hasPermission('settings_dorm') || hasPermission('settings_rent') || hasPermission('settings_users')) && (
          <div className="pt-2 mt-2 border-t border-sidebar-border">
            {!isCollapsed && <div className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Sidebar.settings')}</div>}
            <button 
              onClick={() => {
                if (isCollapsed) toggleSidebar();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              title={isCollapsed ? t('Sidebar.settings') : ''}
              className={`group w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2 rounded-md text-left transition-all duration-200 ${isSettingsActive ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'}`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <div className={`flex-shrink-0 transition-colors ${isSettingsActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                {!isCollapsed && <span className="text-sm whitespace-nowrap">{t('Sidebar.settings')}</span>}
              </div>
              {!isCollapsed && (
                <svg className={`w-4 h-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
              )}
            </button>
            
            {/* Only show submenu if not collapsed (or handled by expanding) */}
            {(!isCollapsed && (isSettingsOpen || isSettingsActive)) && (
              <div className="ml-4 mt-1 space-y-1 pl-4 border-l border-sidebar-border">
                {SETTINGS_ITEMS.map(item => hasPermission(item.id) && (
                  <Link 
                    key={item.id}
                    href={item.href} 
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${isActive(item.href) ? 'text-primary font-medium bg-sidebar-accent' : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'}`}
                    onClick={() => {
                      try {
                        api.createActivityLog({
                          action: 'CLICK',
                          path: item.href,
                          userId: currentUser?.id,
                          username: currentUser?.username,
                        }).catch(() => {});
                      } catch {}
                    }}
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        {currentUser ? (
          <div className={`flex flex-col gap-3`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-primary font-medium text-xs ring-2 ring-white">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-foreground truncate">{currentUser.username}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{currentUser.role.toLowerCase()}</p>
                </div>
              )}
              {!isCollapsed && (
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  title={t('Sidebar.logout')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Language Switcher */}
            <div className={`flex gap-2 ${isCollapsed ? 'flex-col items-center' : 'justify-center'}`}>
              <button 
                onClick={() => router.replace(pathname, {locale: 'th'})}
                className="text-xs px-2 py-1 rounded border hover:bg-muted"
              >
                TH
              </button>
              <button 
                onClick={() => router.replace(pathname, {locale: 'en'})}
                className="text-xs px-2 py-1 rounded border hover:bg-muted"
              >
                EN
              </button>
            </div>
          </div>
        ) : (
          <div className="h-8 bg-sidebar-accent rounded animate-pulse"></div>
        )}
      </div>
    </aside>
  );
}

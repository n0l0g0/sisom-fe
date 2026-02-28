'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [lineError, setLineError] = useState('');
  const isMobile = typeof navigator !== 'undefined'
    ? /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Mobile/i.test(navigator.userAgent)
    : false;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(username, password);
      document.cookie = `sisom_token=${response.access_token}; path=/; max-age=86400; SameSite=Strict`;
      localStorage.setItem('sisom_user', JSON.stringify(response.user));
      const pathParam = searchParams?.get('path');
      const isStaff =
        response.user?.role === 'OWNER' ||
        response.user?.role === 'ADMIN' ||
        (Array.isArray(response.user?.permissions) && response.user.permissions.includes('meter'));
      const target = pathParam || (isStaff ? '/meter' : '/');
      router.push(target);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const ensureLiffReady = () => {
    if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
    if ((window as any).liff) return Promise.resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[data-liff-sdk="1"]');
    if (existing) {
      return new Promise<void>((resolve, reject) => {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load LIFF')));
      });
    }
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.async = true;
      script.dataset.liffSdk = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load LIFF'));
      document.body.appendChild(script);
    });
  };

  const handleLineLogin = async () => {
    setLineLoading(true);
    setLineError('');
    try {
      if (!isMobile) {
        setLineError('ฟังก์ชันนี้ใช้ได้เฉพาะบนมือถือ');
        return;
      }
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        throw new Error('LINE login is not configured');
      }
      await ensureLiffReady();
      const liff = (window as any).liff;
      await liff.init({ liffId });
      const isInClient = typeof liff.isInClient === 'function' ? liff.isInClient() : false;
      if (!isInClient && typeof liff.isLoggedIn === 'function' && !liff.isLoggedIn()) {
        const href = window.location.href;
        let redirectUri = href;
        try {
          const u = new URL(href);
          if (u.hostname !== 'line-sisom.washqueue.com') {
            redirectUri = `https://line-sisom.washqueue.com${u.pathname}${u.search}`;
          }
        } catch {}
        await liff.login({ redirectUri });
        return;
      }
      const profile = await liff.getProfile();
      const userId = profile?.userId as string | undefined;
      if (!userId) {
        throw new Error('ไม่สามารถอ่าน LINE user id ได้');
      }
      const response = await api.loginWithLine(userId);
      document.cookie = `sisom_token=${response.access_token}; path=/; max-age=86400; SameSite=Strict`;
      localStorage.setItem('sisom_user', JSON.stringify(response.user));
      const pathParam = searchParams?.get('path');
      const isStaff =
        response.user?.role === 'OWNER' ||
        response.user?.role === 'ADMIN' ||
        (Array.isArray(response.user?.permissions) && response.user.permissions.includes('meter'));
      const target = pathParam || (isStaff ? '/meter' : '/');
      router.push(target);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'LINE login failed';
      setLineError(message);
    } finally {
      setLineLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!isMobile) return;
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;
        await ensureLiffReady();
        const liff = (window as any).liff;
        await liff.init({ liffId });
        const hasPath = !!searchParams?.get('path');
        const isInClient = typeof liff.isInClient === 'function' ? liff.isInClient() : false;
        const isLoggedIn = typeof liff.isLoggedIn === 'function' ? liff.isLoggedIn() : false;
        if (isInClient || isLoggedIn || hasPath) {
          await handleLineLogin();
        }
      } catch {
      }
    })();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access the system.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {(error || lineError) && (
                <p className="text-sm text-red-500">
                  {error || lineError}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={loading || lineLoading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleLineLogin}
              disabled={lineLoading || loading}
            >
              {lineLoading ? 'กำลังตรวจสอบ LINE...' : 'Login ด้วย LINE'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">กำลังโหลด...</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

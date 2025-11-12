'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setTokens } from '@/lib/api';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in development mode (React StrictMode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    // Support legacy single token parameter for backward compatibility
    const legacyToken = searchParams.get('token');

    if (accessToken && refreshToken) {
      // Store both tokens in localStorage
      setTokens(accessToken, refreshToken);

      // Redirect to dashboard
      router.push('/dashboard');
    } else if (legacyToken) {
      // Legacy support: single token (treat as access token)
      localStorage.setItem('accessToken', legacyToken);

      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      // If no tokens, redirect to login
      router.push('/login');
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Redirecting to dashboard...</div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}

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
    const code = searchParams.get('code');

    // Support legacy single token parameter for backward compatibility
    const legacyToken = searchParams.get('token');

    if (accessToken && refreshToken) {
      // Development mode: Direct token passing
      console.log('✅ SUCCESS PAGE: Setting tokens in localStorage');
      setTokens(accessToken, refreshToken);

      // Verify tokens were written
      const verifyAccess = localStorage.getItem('accessToken');
      const verifyRefresh = localStorage.getItem('refreshToken');
      console.log('✅ SUCCESS PAGE: Tokens verified in localStorage:', {
        accessToken: !!verifyAccess,
        refreshToken: !!verifyRefresh
      });

      // Wait longer to ensure ChatContext has time to detect and initialize with tokens
      // This gives the polling mechanism in ChatContext time to pick up the tokens
      setTimeout(() => {
        console.log('✅ SUCCESS PAGE: Redirecting to dashboard...');
        router.push('/dashboard');
      }, 500); // Increased from 100ms to 500ms
    } else if (code) {
      // Production mode: Exchange code for tokens
      console.log('✅ SUCCESS PAGE: Exchanging session code for tokens');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      fetch(`${API_URL}/auth/exchange-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to exchange code for tokens');
          }
          return response.json();
        })
        .then((data) => {
          if (data.accessToken && data.refreshToken) {
            console.log('✅ SUCCESS PAGE: Setting tokens from code exchange');
            setTokens(data.accessToken, data.refreshToken);

            // Verify tokens were written
            const verifyAccess = localStorage.getItem('accessToken');
            const verifyRefresh = localStorage.getItem('refreshToken');
            console.log('✅ SUCCESS PAGE: Tokens verified in localStorage:', {
              accessToken: !!verifyAccess,
              refreshToken: !!verifyRefresh
            });

            setTimeout(() => {
              console.log('✅ SUCCESS PAGE: Redirecting to dashboard...');
              router.push('/dashboard');
            }, 500);
          } else {
            console.error('❌ No tokens in response');
            router.push('/login');
          }
        })
        .catch((error) => {
          console.error('❌ Failed to exchange code:', error);
          router.push('/login');
        });
    } else if (legacyToken) {
      // Legacy support: single token (treat as access token)
      localStorage.setItem('accessToken', legacyToken);

      // Small delay to ensure localStorage is fully written before navigation
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } else {
      // If no tokens or code, redirect to login
      console.error('❌ No tokens or code found in URL');
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

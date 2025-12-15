'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect } from 'react';

export const ThemeClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useTheme();

  // Prevent flash of unstyled content
  if (loading) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
};
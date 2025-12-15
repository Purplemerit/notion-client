'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);

  const getSystemTheme = (): 'light' | 'dark' =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  const applyTheme = (resolvedTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    // ensure we remove any previous theme class and set the new one
    root.classList.remove('light', 'dark');
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    // also set a data attribute for easier debugging/selectors
    root.setAttribute('data-theme', resolvedTheme);
    setActualTheme(resolvedTheme);
    // debug info
    // eslint-disable-next-line no-console
    console.debug('[Theme] applied', { resolvedTheme, classList: Array.from(root.classList) });
  };

  const resolveTheme = (t: Theme): 'light' | 'dark' =>
    t === 'auto' ? getSystemTheme() : t;

  useEffect(() => {
    // Initialize theme from localStorage (if any) or keep 'auto'
    const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('theme')) as Theme | null;
    const initialTheme: Theme = (savedTheme ?? 'auto') as Theme;
    // log initial state for debugging
    // eslint-disable-next-line no-console
    console.debug('[Theme] init', { savedTheme, initialTheme, systemPrefersDark: getSystemTheme() });
    setThemeState(initialTheme);
    applyTheme(resolveTheme(initialTheme));
    setLoading(false);
  }, []);

  // Listen to system theme changes if theme is 'auto'
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // eslint-disable-next-line no-console
      console.debug('[Theme] system preference changed', e.matches ? 'dark' : 'light');
      applyTheme(e.matches ? 'dark' : 'light');
    };
    // addEventListener may not exist on older browsers; fallback to addListener
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler as any);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler as any);
    };
  }, [theme]);

  // Make setTheme explicit and return a Promise so callers can await if desired.
  const setTheme = async (newTheme: Theme) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme);
      }
      setThemeState(newTheme);
      const resolved = resolveTheme(newTheme);
      applyTheme(resolved);
      // eslint-disable-next-line no-console
      console.debug('[Theme] setTheme', { newTheme, resolved });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Theme] setTheme failed', err);
    }
    return Promise.resolve();
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

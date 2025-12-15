/** @type {import('tailwindcss').Config} */
const withHslVar = (variable) => ({ opacityValue }) => {
  if (opacityValue === undefined) return `hsl(var(${variable}))`;
  return `hsl(var(${variable}) / ${opacityValue})`;
};

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: withHslVar('--background'),
        surface: withHslVar('--surface'),
        card: withHslVar('--card'),
        foreground: withHslVar('--foreground'),
        muted: withHslVar('--muted-foreground'),
        primary: withHslVar('--primary'),
        'primary-foreground': withHslVar('--primary-foreground'),
        secondary: withHslVar('--secondary'),
        accent: withHslVar('--accent'),
        destructive: withHslVar('--destructive'),
        success: withHslVar('--success'),
        warning: withHslVar('--warning'),
        info: withHslVar('--info'),
        border: withHslVar('--border'),
        input: withHslVar('--input'),
        sidebar: withHslVar('--sidebar-bg'),
      },
    },
  },
  plugins: [],
};
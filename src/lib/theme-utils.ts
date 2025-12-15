// Utility functions for dark theme styling
export const darkThemeClasses = {
  // Backgrounds
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
    card: 'bg-white dark:bg-gray-800',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
  },

  // Text colors
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-700 dark:text-gray-300',
    tertiary: 'text-gray-500 dark:text-gray-400',
    muted: 'text-gray-400 dark:text-gray-500',
    white: 'text-white dark:text-gray-100',
  },

  // Borders
  border: {
    default: 'border-gray-200 dark:border-gray-700',
    light: 'border-gray-100 dark:border-gray-800',
    hover: 'hover:border-gray-300 dark:hover:border-gray-600',
  },

  // Inputs
  input: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-900 dark:text-gray-100',
    placeholder: 'placeholder-gray-400 dark:placeholder-gray-500',
  },

  // Buttons
  button: {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:hover:bg-purple-600',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  },

  // Shadows
  shadow: {
    sm: 'shadow-sm dark:shadow-gray-900/50',
    md: 'shadow-md dark:shadow-gray-900/50',
    lg: 'shadow-lg dark:shadow-gray-900/50',
  },
};

// Gradient backgrounds for dashboards
export const gradientBg = 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-900 dark:to-gray-800';

// Combine multiple theme classes
export const cx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

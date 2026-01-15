import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Language, t as translate, isRTL } from '@/lib/translations';

type Theme = 'dark' | 'light' | 'system';
type Timezone = 'utc' | 'paris' | 'madrid' | 'casablanca' | 'dubai';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  timezone: Timezone;
  setTimezone: (tz: Timezone) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'mcm-theme';
const STORAGE_KEY_LANG = 'mcm-language';
const STORAGE_KEY_TZ = 'mcm-timezone';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return (saved as Theme) || 'dark';
  });
  
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    return (saved as Language) || 'en';
  });

  const [timezone, setTimezoneState] = useState<Timezone>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TZ);
    return (saved as Timezone) || 'utc';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  // Apply RTL direction for Arabic
  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
  }, [language]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
  };

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem(STORAGE_KEY_LANG, newLang);
  };

  const setTimezone = (newTz: Timezone) => {
    setTimezoneState(newTz);
    localStorage.setItem(STORAGE_KEY_TZ, newTz);
  };

  const t = (key: string) => translate(key, language);

  return (
    <SettingsContext.Provider value={{
      theme,
      setTheme,
      language,
      setLanguage,
      timezone,
      setTimezone,
      t,
      isRTL: isRTL(language),
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

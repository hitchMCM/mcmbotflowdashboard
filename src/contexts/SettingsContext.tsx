import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Language, t as translate, isRTL } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';

export type Theme = 'dark' | 'light' | 'system';
export type Timezone = 'utc' | 'paris' | 'madrid' | 'casablanca' | 'dubai';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  timezone: Timezone;
  setTimezone: (tz: Timezone) => void;
  t: (key: string) => string;
  isRTL: boolean;
  saveSettingsToDatabase: () => Promise<boolean>;
  loadSettingsFromDatabase: () => Promise<void>;
  isSaving: boolean;
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

  const [isSaving, setIsSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Helper to get current user ID
  const getCurrentUserId = (): string | null => {
    try {
      const userStr = localStorage.getItem('mcm_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || null;
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
    return null;
  };

  // Check for user changes periodically and on storage events
  useEffect(() => {
    const checkUser = () => {
      const userId = getCurrentUserId();
      if (userId !== currentUserId) {
        setCurrentUserId(userId);
      }
    };

    // Check immediately
    checkUser();

    // Listen for storage events (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mcm_user') {
        checkUser();
      }
    };

    // Also check periodically for same-tab changes
    const interval = setInterval(checkUser, 1000);

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentUserId]);

  // Load settings from database for current user
  const loadSettingsFromDatabase = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('theme,language,timezone')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        if (data.theme) {
          setThemeState(data.theme as Theme);
          localStorage.setItem(STORAGE_KEY_THEME, data.theme);
        }
        if (data.language) {
          setLanguageState(data.language as Language);
          localStorage.setItem(STORAGE_KEY_LANG, data.language);
        }
        if (data.timezone) {
          setTimezoneState(data.timezone as Timezone);
          localStorage.setItem(STORAGE_KEY_TZ, data.timezone);
        }
      }
    } catch (error) {
      console.error('Error loading settings from database:', error);
    }
  };

  // Save settings to database for current user
  const saveSettingsToDatabase = async (): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.error('No user ID found');
      return false;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          theme,
          language,
          timezone
        })
        .eq('id', userId);

      if (error) {
        console.error('Error saving settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving settings to database:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Load settings from database when user changes
  useEffect(() => {
    if (currentUserId) {
      loadSettingsFromDatabase();
    }
  }, [currentUserId]);

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
      saveSettingsToDatabase,
      loadSettingsFromDatabase,
      isSaving,
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

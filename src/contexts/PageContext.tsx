import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Page {
  id: string;
  facebook_page_id: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  subscribers_count: number;
  access_token?: string | null;
  user_id?: string;
}

interface PageContextType {
  currentPage: Page | null;
  pages: Page[];
  setCurrentPage: (page: Page) => void;
  loading: boolean;
  refreshPages: () => Promise<void>;
  currentUserId: string | null;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

// Get current user from localStorage
const getCurrentUserId = (): string | null => {
  try {
    const userStr = localStorage.getItem('mcm_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || null;
    }
  } catch (e) {
    console.error('[PageContext] Error parsing user:', e);
  }
  return null;
};

export function PageProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(getCurrentUserId());

  console.log('[PageContext] Initializing...');

  const loadPages = async () => {
    console.log('[PageContext] Loading pages from Supabase...');
    
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
    console.log('[PageContext] Current user ID:', userId);
    
    if (!userId) {
      console.log('[PageContext] No user logged in, showing empty state');
      setPages([]);
      setCurrentPage(null);
      setLoading(false);
      return;
    }
    
    // Timeout de 5 secondes max
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    try {
      // Load only pages belonging to the current user
      const fetchPromise = supabase
        .from('pages')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      
      const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const { data, error } = result;

      console.log('[PageContext] Supabase response - data:', data);
      console.log('[PageContext] Supabase response - error:', error);

      if (error) {
        console.error('[PageContext] Error loading pages:', error.message);
        // Show empty state on error
        setPages([]);
        setCurrentPage(null);
        setLoading(false);
        return;
      }

      // Map data to Page interface
      const loadedPages: Page[] = (data || []).map((row: any) => ({
        id: row.id,
        facebook_page_id: row.facebook_page_id || row.fb_page_id,
        name: row.name || row.page_name || 'Unnamed Page',
        avatar_url: row.avatar_url,
        is_active: row.is_active ?? true,
        subscribers_count: row.subscribers_count || 0,
        access_token: row.access_token,
        user_id: row.user_id
      }));
      
      console.log('[PageContext] Mapped pages:', loadedPages);
      
      // If no pages exist for this user, show empty state (no demo page)
      if (loadedPages.length === 0) {
        console.log('[PageContext] No pages found for user, showing empty state');
        setPages([]);
        setCurrentPage(null);
        setLoading(false);
        return;
      }

      setPages(loadedPages);

      // Set current page from localStorage or first page
      const savedPageId = localStorage.getItem('current_page_id');
      if (savedPageId) {
        const saved = loadedPages.find(p => p.id === savedPageId);
        if (saved) {
          console.log('[PageContext] Restored saved page:', saved.name);
          setCurrentPage(saved);
          setLoading(false);
          return;
        }
      }

      // Default to first page
      console.log('[PageContext] Using first page:', loadedPages[0].name);
      setCurrentPage(loadedPages[0]);
    } catch (error) {
      console.error('Error loading pages:', error);
      // Show empty state on any error (including timeout)
      console.log('[PageContext] Exception caught (timeout or error), showing empty state');
      setPages([]);
      setCurrentPage(null);
      setLoading(false);
    } finally {
      console.log('[PageContext] Loading complete');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleSetCurrentPage = (page: Page) => {
    setCurrentPage(page);
    localStorage.setItem('current_page_id', page.id);
  };

  return (
    <PageContext.Provider 
      value={{ 
        currentPage, 
        pages, 
        setCurrentPage: handleSetCurrentPage, 
        loading,
        refreshPages: loadPages,
        currentUserId
      }}
    >
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <div style={{ fontSize: '18px', fontWeight: 500 }}>Loading MCM BotFlow...</div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '10px' }}>
              Connecting to dashboard
            </div>
            <style>
              {`@keyframes spin { to { transform: rotate(360deg); } }`}
            </style>
          </div>
        </div>
      ) : (
        children
      )}
    </PageContext.Provider>
  );
}

export function usePage() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePage must be used within a PageProvider');
  }
  return context;
}

-- Allow public read access to pages (for development/testing)
-- This allows unauthenticated users to see all pages

-- Drop existing SELECT policy if exists
DROP POLICY IF EXISTS "Users can view their own pages" ON public.pages;

-- Create new policy that allows anyone to read pages
CREATE POLICY "Anyone can view pages" ON public.pages 
  FOR SELECT 
  USING (true);

-- Keep write policies restricted to authenticated users
-- UPDATE and DELETE policies remain unchanged

-- Also allow public read for messages table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;
    CREATE POLICY "Anyone can view messages" ON public.messages FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;
    CREATE POLICY "Anyone can insert messages" ON public.messages FOR INSERT WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Anyone can update messages" ON public.messages;
    CREATE POLICY "Anyone can update messages" ON public.messages FOR UPDATE USING (true);
    
    DROP POLICY IF EXISTS "Anyone can delete messages" ON public.messages;
    CREATE POLICY "Anyone can delete messages" ON public.messages FOR DELETE USING (true);
  END IF;
END $$;

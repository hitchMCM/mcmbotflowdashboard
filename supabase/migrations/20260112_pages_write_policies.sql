-- Allow public INSERT/UPDATE/DELETE on pages table for development
-- Run this in Supabase SQL Editor

-- Allow anyone to insert pages
DROP POLICY IF EXISTS "Anyone can insert pages" ON public.pages;
CREATE POLICY "Anyone can insert pages" ON public.pages 
  FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to update pages
DROP POLICY IF EXISTS "Anyone can update pages" ON public.pages;
CREATE POLICY "Anyone can update pages" ON public.pages 
  FOR UPDATE 
  USING (true);

-- Allow anyone to delete pages
DROP POLICY IF EXISTS "Anyone can delete pages" ON public.pages;
CREATE POLICY "Anyone can delete pages" ON public.pages 
  FOR DELETE 
  USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'pages';

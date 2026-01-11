-- =====================================================================================
-- Allow public read/write access to subscribers (for development/testing)
-- Run this in Supabase SQL Editor
-- =====================================================================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.subscribers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Anyone can insert subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Anyone can update subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Anyone can delete subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view their own subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Users can manage their own subscribers" ON public.subscribers;

-- Create permissive policies for development
CREATE POLICY "Anyone can view subscribers" ON public.subscribers 
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert subscribers" ON public.subscribers 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update subscribers" ON public.subscribers 
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete subscribers" ON public.subscribers 
  FOR DELETE USING (true);

-- Verify
SELECT 'Subscribers RLS policies updated' as status;

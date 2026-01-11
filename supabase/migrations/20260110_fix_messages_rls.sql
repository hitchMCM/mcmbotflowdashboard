-- =====================================================================================
-- Migration: Fix Messages RLS for Development
-- Date: 2026-01-10
-- Description: Allow all operations on messages table for development
-- =====================================================================================

-- Drop all existing policies on messages
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can delete messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can manage messages" ON public.messages;

-- For development: allow all operations
CREATE POLICY "messages_select_policy" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_insert_policy" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update_policy" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "messages_delete_policy" ON public.messages FOR DELETE USING (true);

-- Also fix page_configs table
DROP POLICY IF EXISTS "Users can view their page configs" ON public.page_configs;
DROP POLICY IF EXISTS "Users can manage their page configs" ON public.page_configs;
DROP POLICY IF EXISTS "page_configs_select_policy" ON public.page_configs;
DROP POLICY IF EXISTS "page_configs_insert_policy" ON public.page_configs;
DROP POLICY IF EXISTS "page_configs_update_policy" ON public.page_configs;
DROP POLICY IF EXISTS "page_configs_delete_policy" ON public.page_configs;

CREATE POLICY "page_configs_select_policy" ON public.page_configs FOR SELECT USING (true);
CREATE POLICY "page_configs_insert_policy" ON public.page_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "page_configs_update_policy" ON public.page_configs FOR UPDATE USING (true);
CREATE POLICY "page_configs_delete_policy" ON public.page_configs FOR DELETE USING (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL ON public.messages TO anon;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.page_configs TO anon;
GRANT ALL ON public.page_configs TO authenticated;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

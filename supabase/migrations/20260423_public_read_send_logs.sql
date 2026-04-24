-- Add public read access to send logs tables for analytics dashboard
-- (Project uses custom auth, not Supabase auth.uid())

DROP POLICY IF EXISTS "Public can view broadcast_logs" ON public.broadcast_logs;
CREATE POLICY "Public can view broadcast_logs" ON public.broadcast_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view flow_logs" ON public.flow_logs;
CREATE POLICY "Public can view flow_logs" ON public.flow_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view broadcasts" ON public.broadcasts;
CREATE POLICY "Public can view broadcasts" ON public.broadcasts
  FOR SELECT USING (true);

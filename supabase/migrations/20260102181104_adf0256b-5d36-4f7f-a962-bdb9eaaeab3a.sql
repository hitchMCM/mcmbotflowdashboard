-- Pages Facebook connectées
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fb_page_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  cover_url TEXT,
  access_token_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  subscribers_count INTEGER DEFAULT 0,
  active_flows_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subscribers par page  
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  facebook_psid TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  flow_progress INTEGER DEFAULT 0,
  flow_total_steps INTEGER DEFAULT 6,
  UNIQUE(page_id, facebook_psid)
);

-- Templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'message',
  content JSONB DEFAULT '{}',
  used_by_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Flows (séquences)
CREATE TABLE public.flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  flow_number INTEGER NOT NULL,
  template_id UUID REFERENCES public.templates(id),
  delay_hours INTEGER DEFAULT 24,
  message_content JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_id, flow_number)
);

-- Flow logs
CREATE TABLE public.flow_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  flow_number INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent'
);

-- Broadcasts
CREATE TABLE public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_pages UUID[] DEFAULT '{}',
  message_content JSONB DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_recipients INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Broadcast logs
CREATE TABLE public.broadcast_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent'
);

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pages
CREATE POLICY "Users can view their own pages" ON public.pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own pages" ON public.pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pages" ON public.pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pages" ON public.pages FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for subscribers (via page ownership)
CREATE POLICY "Users can view subscribers of their pages" ON public.subscribers FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = subscribers.page_id AND pages.user_id = auth.uid()));
CREATE POLICY "Users can create subscribers for their pages" ON public.subscribers FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = subscribers.page_id AND pages.user_id = auth.uid()));
CREATE POLICY "Users can update subscribers of their pages" ON public.subscribers FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = subscribers.page_id AND pages.user_id = auth.uid()));
CREATE POLICY "Users can delete subscribers of their pages" ON public.subscribers FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = subscribers.page_id AND pages.user_id = auth.uid()));

-- RLS Policies for templates
CREATE POLICY "Users can view their own templates" ON public.templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own templates" ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.templates FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for flows (via page ownership)
CREATE POLICY "Users can view flows of their pages" ON public.flows FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = flows.page_id AND pages.user_id = auth.uid()));
CREATE POLICY "Users can create flows for their pages" ON public.flows FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = flows.page_id AND pages.user_id = auth.uid()));
CREATE POLICY "Users can update flows of their pages" ON public.flows FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = flows.page_id AND pages.user_id = auth.uid()));
CREATE POLICY "Users can delete flows of their pages" ON public.flows FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.pages WHERE pages.id = flows.page_id AND pages.user_id = auth.uid()));

-- RLS Policies for flow_logs
CREATE POLICY "Users can view flow logs of their subscribers" ON public.flow_logs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.subscribers s 
    JOIN public.pages p ON s.page_id = p.id 
    WHERE s.id = flow_logs.subscriber_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can create flow logs" ON public.flow_logs FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.subscribers s 
    JOIN public.pages p ON s.page_id = p.id 
    WHERE s.id = flow_logs.subscriber_id AND p.user_id = auth.uid()
  ));

-- RLS Policies for broadcasts
CREATE POLICY "Users can view their own broadcasts" ON public.broadcasts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own broadcasts" ON public.broadcasts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own broadcasts" ON public.broadcasts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own broadcasts" ON public.broadcasts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for broadcast_logs
CREATE POLICY "Users can view broadcast logs of their broadcasts" ON public.broadcast_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.broadcasts WHERE broadcasts.id = broadcast_logs.broadcast_id AND broadcasts.user_id = auth.uid()));
CREATE POLICY "Users can create broadcast logs" ON public.broadcast_logs FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.broadcasts WHERE broadcasts.id = broadcast_logs.broadcast_id AND broadcasts.user_id = auth.uid()));

-- RLS Policies for activity_logs
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own activity logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
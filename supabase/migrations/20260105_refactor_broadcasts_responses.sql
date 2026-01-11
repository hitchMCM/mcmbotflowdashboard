-- =====================================================
-- MIGRATION: Refactor Broadcasts & Responses
-- Relation: 1 broadcast/response → plusieurs messages (random pick)
-- =====================================================

-- =====================================================
-- 1. BROADCAST_MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    buttons JSONB DEFAULT '[]'::jsonb,
    text_content TEXT DEFAULT '',
    message_type TEXT DEFAULT 'template' CHECK (message_type IN ('text', 'template')),
    is_enabled BOOLEAN DEFAULT true,
    weight INTEGER DEFAULT 1, -- Pour pondérer le random pick
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_broadcast_id ON broadcast_messages(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_enabled ON broadcast_messages(broadcast_id, is_enabled);

-- =====================================================
-- 2. RESPONSE_MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS response_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    buttons JSONB DEFAULT '[]'::jsonb,
    text_content TEXT DEFAULT '',
    message_type TEXT DEFAULT 'template' CHECK (message_type IN ('text', 'template')),
    is_enabled BOOLEAN DEFAULT true,
    weight INTEGER DEFAULT 1, -- Pour pondérer le random pick
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_response_messages_response_id ON response_messages(response_id);
CREATE INDEX IF NOT EXISTS idx_response_messages_enabled ON response_messages(response_id, is_enabled);

-- =====================================================
-- 3. UPDATE BROADCASTS TABLE (simplifier)
-- =====================================================

-- Ajouter les nouvelles colonnes si elles n'existent pas
ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS target_all BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scheduled_time TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- 4. UPDATE RESPONSES TABLE (simplifier)
-- =====================================================

-- Ajouter les nouvelles colonnes si elles n'existent pas
ALTER TABLE responses
ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'contains' CHECK (trigger_type IN ('exact', 'contains', 'starts_with', 'regex')),
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- 5. FONCTIONS HELPER POUR RANDOM PICK
-- =====================================================

-- Fonction pour récupérer un message random d'un broadcast
CREATE OR REPLACE FUNCTION get_random_broadcast_message(p_broadcast_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    subtitle TEXT,
    image_url TEXT,
    buttons JSONB,
    text_content TEXT,
    message_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bm.id,
        bm.title,
        bm.subtitle,
        bm.image_url,
        bm.buttons,
        bm.text_content,
        bm.message_type
    FROM broadcast_messages bm
    WHERE bm.broadcast_id = p_broadcast_id
      AND bm.is_enabled = true
    ORDER BY random()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer un message random d'une response
CREATE OR REPLACE FUNCTION get_random_response_message(p_response_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    subtitle TEXT,
    image_url TEXT,
    buttons JSONB,
    text_content TEXT,
    message_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.id,
        rm.title,
        rm.subtitle,
        rm.image_url,
        rm.buttons,
        rm.text_content,
        rm.message_type
    FROM response_messages rm
    WHERE rm.response_id = p_response_id
      AND rm.is_enabled = true
    ORDER BY random()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS POUR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_broadcast_messages_updated_at ON broadcast_messages;
CREATE TRIGGER update_broadcast_messages_updated_at
    BEFORE UPDATE ON broadcast_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_response_messages_updated_at ON response_messages;
CREATE TRIGGER update_response_messages_updated_at
    BEFORE UPDATE ON response_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. VUE POUR STATISTIQUES
-- =====================================================

CREATE OR REPLACE VIEW broadcast_stats AS
SELECT 
    b.id,
    b.name,
    b.status,
    b.scheduled_at,
    COUNT(bm.id) as message_count,
    COUNT(bm.id) FILTER (WHERE bm.is_enabled) as enabled_message_count
FROM broadcasts b
LEFT JOIN broadcast_messages bm ON bm.broadcast_id = b.id
GROUP BY b.id;

CREATE OR REPLACE VIEW response_stats AS
SELECT 
    r.id,
    r.name,
    r.is_enabled,
    COUNT(rm.id) as message_count,
    COUNT(rm.id) FILTER (WHERE rm.is_enabled) as enabled_message_count
FROM responses r
LEFT JOIN response_messages rm ON rm.response_id = r.id
GROUP BY r.id;

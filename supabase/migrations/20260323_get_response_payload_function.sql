-- RPC function: get_response_payload
-- Used by n8n to retrieve the full response config + subscriber info for a given page/psid.
-- Returns access_token and facebook_page_id from the pages table — never hardcoded.
--
-- Usage:
--   SELECT * FROM get_response_payload('page-uuid-here', 'psid-here');

CREATE OR REPLACE FUNCTION get_response_payload(
  p_page_id UUID,
  p_psid    TEXT
)
RETURNS TABLE (
  psid                        TEXT,
  subscriber_name             TEXT,
  first_name                  TEXT,
  last_name                   TEXT,
  is_active                   BOOLEAN,
  delay_seconds               INT,
  messages_count              INT,
  reset_period_hours          INT,
  is_enabled                  BOOLEAN,
  selection_mode              TEXT,
  ai_prompt                   TEXT,
  ai_links                    TEXT[],
  ai_images                   TEXT[],
  message_id                  UUID,
  title                       TEXT,
  subtitle                    TEXT,
  text_content                TEXT,
  image_url                   TEXT,
  buttons                     JSONB,
  quick_replies               JSONB,
  elements                    JSONB,
  media_type                  TEXT,
  messenger_payload           JSONB,
  page_id                     UUID,
  facebook_page_id            TEXT,
  access_token                TEXT,
  quota_reached               BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH config AS (
    SELECT
      pc.id              AS config_id,
      pc.messages_count,
      pc.reset_period_hours,
      pc.delay_seconds,
      pc.is_enabled,
      pc.selected_message_ids,
      pc.selection_mode,
      pc.ai_prompt,
      pc.ai_links,
      pc.ai_images
    FROM page_configs pc
    WHERE pc.page_id  = p_page_id
      AND pc.category = 'response'
      AND pc.is_enabled = true
    ORDER BY pc.updated_at DESC
    LIMIT 1
  ),
  subscriber_info AS (
    SELECT
      s.psid,
      s.standard_replies_sent,
      s.standard_replies_window_start,
      COALESCE(
        s.name_complet,
        NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), ''),
        'Friend'
      ) AS subscriber_name,
      s.first_name,
      s.last_name,
      s.is_active
    FROM subscribers s
    WHERE s.psid    = p_psid
      AND s.page_id = p_page_id
  ),
  page_info AS (
    SELECT
      p.fb_page_id,
      p.access_token_encrypted AS access_token   -- rename in SELECT for clarity
    FROM pages p
    WHERE p.id = p_page_id
  )
  SELECT
    si.psid,
    si.subscriber_name,
    si.first_name,
    si.last_name,
    si.is_active,
    c.delay_seconds,
    c.messages_count,
    c.reset_period_hours,
    c.is_enabled,
    c.selection_mode,
    c.ai_prompt,
    c.ai_links,
    c.ai_images,
    m.id           AS message_id,
    m.title,
    m.subtitle,
    m.text_content,
    m.image_url,
    m.buttons,
    m.quick_replies,
    m.elements,
    m.media_type,
    m.messenger_payload,
    p_page_id      AS page_id,
    pi.fb_page_id  AS facebook_page_id,
    pi.access_token,
    CASE
      WHEN c.is_enabled = false THEN true
      WHEN si.standard_replies_window_start < NOW() - (c.reset_period_hours || ' hours')::interval THEN false
      WHEN c.messages_count = 0 THEN false
      WHEN si.standard_replies_sent < c.messages_count THEN false
      ELSE true
    END AS quota_reached
  FROM subscriber_info si
  CROSS JOIN config c
  CROSS JOIN page_info pi
  LEFT JOIN LATERAL (
    SELECT *
    FROM messages
    WHERE id = ANY(c.selected_message_ids)
      AND is_active = true
    ORDER BY RANDOM()
    LIMIT 1
  ) m ON (c.selection_mode IS NULL OR c.selection_mode != 'ai');
$$;

-- Grant execute to the anon/service_role used by n8n
GRANT EXECUTE ON FUNCTION get_response_payload(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_response_payload(UUID, TEXT) TO service_role;

-- Notify PostgREST to expose the new function
NOTIFY pgrst, 'reload schema';

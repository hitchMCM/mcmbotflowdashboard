-- =====================================================================================
-- Migration: Response Keywords Management
-- Date: 2026-01-07
-- Description: Add table and functions to manage response keywords per page
-- =====================================================================================

-- Table: response_keywords
-- Purpose: Store keywords that trigger auto-responses for each page
CREATE TABLE IF NOT EXISTS response_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each page can only have one entry per keyword
    UNIQUE(page_id, keyword)
);

CREATE INDEX idx_response_keywords_page ON response_keywords(page_id);
CREATE INDEX idx_response_keywords_keyword ON response_keywords(keyword);

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

-- Function: add_response_keyword
-- Purpose: Add a keyword to trigger auto-responses for a page
CREATE OR REPLACE FUNCTION add_response_keyword(
    p_page_id UUID,
    p_keyword TEXT
)
RETURNS UUID AS $$
DECLARE
    v_keyword_id UUID;
    v_normalized_keyword TEXT;
BEGIN
    -- Normalize keyword (lowercase, trim)
    v_normalized_keyword := LOWER(TRIM(p_keyword));
    
    -- Validate keyword
    IF v_normalized_keyword = '' THEN
        RAISE EXCEPTION 'Keyword cannot be empty';
    END IF;
    
    -- Insert keyword
    INSERT INTO response_keywords (page_id, keyword)
    VALUES (p_page_id, v_normalized_keyword)
    ON CONFLICT (page_id, keyword) DO NOTHING
    RETURNING id INTO v_keyword_id;
    
    -- If keyword already exists, get its ID
    IF v_keyword_id IS NULL THEN
        SELECT id INTO v_keyword_id 
        FROM response_keywords 
        WHERE page_id = p_page_id AND keyword = v_normalized_keyword;
    END IF;
    
    RETURN v_keyword_id;
END;
$$ LANGUAGE plpgsql;

-- Function: remove_response_keyword
-- Purpose: Remove a keyword from a page's auto-response triggers
CREATE OR REPLACE FUNCTION remove_response_keyword(
    p_page_id UUID,
    p_keyword TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_normalized_keyword TEXT;
    v_deleted_count INTEGER;
BEGIN
    -- Normalize keyword (lowercase, trim)
    v_normalized_keyword := LOWER(TRIM(p_keyword));
    
    -- Delete keyword
    DELETE FROM response_keywords
    WHERE page_id = p_page_id AND keyword = v_normalized_keyword;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Also delete any response config for this keyword
    DELETE FROM page_response_config
    WHERE page_id = p_page_id AND keyword = v_normalized_keyword;
    
    RETURN v_deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function: get_page_keywords
-- Purpose: Get all keywords configured for a page
CREATE OR REPLACE FUNCTION get_page_keywords(p_page_id UUID)
RETURNS TABLE (
    keyword TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT rk.keyword, rk.created_at
    FROM response_keywords rk
    WHERE rk.page_id = p_page_id
    ORDER BY rk.keyword;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE response_keywords IS 'Keywords that trigger auto-responses per page';
COMMENT ON FUNCTION add_response_keyword IS 'Add a keyword to trigger auto-responses';
COMMENT ON FUNCTION remove_response_keyword IS 'Remove a keyword from auto-response triggers';
COMMENT ON FUNCTION get_page_keywords IS 'Get all keywords configured for a page';

-- =====================================================================================
-- CLEANUP SCRIPT - Delete all subscribers and message logs
-- Date: 2026-01-11
-- WARNING: This will permanently delete all data from these tables!
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Delete logs first (they reference subscribers)
-- =====================================================================================

-- Delete message logs
DELETE FROM message_logs;
SELECT 'message_logs cleaned' as status, COUNT(*) as remaining FROM message_logs;

-- Delete flow logs (sequence sends)
DELETE FROM flow_logs;
SELECT 'flow_logs cleaned' as status, COUNT(*) as remaining FROM flow_logs;

-- Delete broadcast logs
DELETE FROM broadcast_logs;
SELECT 'broadcast_logs cleaned' as status, COUNT(*) as remaining FROM broadcast_logs;

-- Delete button clicks
DELETE FROM button_clicks;
SELECT 'button_clicks cleaned' as status, COUNT(*) as remaining FROM button_clicks;

-- Delete activity logs (optional - comment out if you want to keep these)
DELETE FROM activity_logs;
SELECT 'activity_logs cleaned' as status, COUNT(*) as remaining FROM activity_logs;

-- =====================================================================================
-- STEP 2: Delete subscribers (after logs are deleted)
-- =====================================================================================

DELETE FROM subscribers;
SELECT 'subscribers cleaned' as status, COUNT(*) as remaining FROM subscribers;

-- =====================================================================================
-- STEP 3: Reset statistics counters on messages (optional)
-- =====================================================================================

-- Reset stats on unified messages table
UPDATE messages SET 
    sent_count = 0,
    delivered_count = 0,
    read_count = 0,
    clicked_count = 0
WHERE sent_count > 0 OR delivered_count > 0 OR read_count > 0 OR clicked_count > 0;

-- Reset stats on page_configs
UPDATE page_configs SET times_triggered = 0 WHERE times_triggered > 0;

-- Reset stats on broadcasts
UPDATE broadcasts SET 
    sent_count = 0,
    failed_count = 0,
    total_recipients = 0
WHERE sent_count > 0 OR failed_count > 0 OR total_recipients > 0;

-- =====================================================================================
-- STEP 4: Verify cleanup
-- =====================================================================================

SELECT 'CLEANUP COMPLETE' as status;

SELECT 
    'subscribers' as table_name, COUNT(*) as count FROM subscribers
UNION ALL
SELECT 'message_logs', COUNT(*) FROM message_logs
UNION ALL
SELECT 'flow_logs', COUNT(*) FROM flow_logs
UNION ALL
SELECT 'broadcast_logs', COUNT(*) FROM broadcast_logs
UNION ALL
SELECT 'button_clicks', COUNT(*) FROM button_clicks
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs;

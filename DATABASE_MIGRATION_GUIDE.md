# Dashboard Database Migration Guide

## Overview
The dashboard has been updated to support the **new unified message architecture** but requires the database migration to be executed.

## Current Status

### ✅ Code Updated
- `src/hooks/useSupabase.ts` - `useDashboardStats()` now queries:
  - `page_configs` table (for welcome message enabled status)
  - `messages` table (for response/sequence/broadcast counts by category)
- All new dashboard components created and ready

### ⚠️ Migration Pending
The SQL migration file exists but needs to be executed in Supabase:
- **File**: `supabase/migrations/20260108_unified_message_architecture.sql`
- **Location**: `f:/VsCode/mcm-botflow-dashboard-main/mcm-botflow-dashboard-main/supabase/migrations/`

## New Database Schema

### Before (Old Architecture)
```
❌ welcome_message (single row)
❌ responses (multiple rows)
❌ response_messages (pool)
❌ sequence_messages (pool)
❌ broadcast_messages (pool)
❌ standard_messages (pool)
❌ response_keywords (config)
❌ page_response_configs
❌ page_sequence_configs
❌ page_broadcast_configs
❌ page_standard_configs
```

### After (New Unified Architecture)
```
✅ messages (unified pool with category field)
   - category: 'welcome' | 'response' | 'sequence' | 'broadcast' | 'standard'
   - Stores all message content

✅ page_configs (unified configuration)
   - category: matches message category
   - selected_message_ids: UUID[] (which messages to use)
   - selection_mode: 'random' | 'fixed' | 'ordered'
   - trigger_keywords: TEXT[] (for responses)
   - delay_hours: INTEGER[] (for sequences)
   - scheduled_time: TIME (for broadcasts)
```

## What the Migration Does

1. **Creates New Tables**
   - `messages` - Unified message pool with category field
   - `page_configs` - Unified per-page configuration

2. **Creates Helper Functions**
   - `get_config_message()` - Get message respecting selection mode
   - `get_page_welcome()` - Get welcome message for page
   - `get_page_response()` - Get response for keyword
   - `get_page_sequence()` - Get sequence message
   - `get_page_broadcast()` - Get broadcast message
   - `get_page_standard()` - Get standard message
   - `upsert_page_config()` - Create/update config
   - `add_config_keyword()` - Add keyword to response
   - `remove_config_keyword()` - Remove keyword
   - `add_config_message()` - Add message to selection
   - `remove_config_message()` - Remove message from selection

3. **Creates Views**
   - `page_configs_detail` - Configs with message details
   - `messages_summary` - Stats by category

4. **Migrates Existing Data**
   - All existing messages moved to `messages` table with proper category
   - All existing configs consolidated into `page_configs`
   - **No data loss** - all data is preserved

## How to Execute Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy entire content of `20260108_unified_message_architecture.sql`
6. Paste into editor
7. Click **Run** (or press Ctrl+Enter)

### Option 2: Supabase CLI
```bash
cd f:/VsCode/mcm-botflow-dashboard-main/mcm-botflow-dashboard-main
supabase db push
```

### Option 3: Direct SQL
```bash
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20260108_unified_message_architecture.sql
```

## What Happens After Migration

### Dashboard Stats Will Show
- ✅ Welcome message enabled: Checks `page_configs` where `category='welcome'` and `is_enabled=true`
- ✅ Response count: Counts `messages` where `category='response'` and `is_active=true`
- ✅ Sequence count: Counts `messages` where `category='sequence'` and `is_active=true`
- ✅ Broadcast count: Counts `messages` where `category='broadcast'` and `is_active=true`

### Activity Feed Will Show
- ✅ Real-time subscriber additions
- ✅ Message sent/delivered/read events from `message_logs`
- ✅ Button clicks from `button_clicks`

### Old Tables Can Be Kept
The migration does **not delete** old tables, so:
- ✅ Safe to rollback if needed
- ✅ Can compare data between old and new
- ⚠️ Eventually should drop old tables to save space

## Verification Queries

After migration, verify with these queries:

```sql
-- Check messages migrated
SELECT category, COUNT(*) as count 
FROM messages 
GROUP BY category;

-- Check page configs
SELECT page_id, category, name, is_enabled 
FROM page_configs 
ORDER BY category, name;

-- Check view works
SELECT * FROM messages_summary;

-- Test function
SELECT * FROM get_page_welcome('your-page-uuid-here');
```

## Dashboard Changes Made

### Files Modified
1. **src/hooks/useSupabase.ts**
   - Updated `useDashboardStats()` to query new tables
   - Changed from `welcome_message` → `page_configs` (category='welcome')
   - Changed from `responses` → `messages` (category='response')
   - Changed from `sequence_messages` → `messages` (category='sequence')
   - Changed from `broadcasts` → `messages` (category='broadcast')

### Files Created
1. **src/pages/DashboardV2.tsx** - Enhanced dashboard with all improvements
2. **src/components/dashboard/StatCard.tsx** - Reusable stat cards
3. **src/components/dashboard/QuickActions.tsx** - Quick action buttons
4. **src/components/dashboard/PageSelector.tsx** - Page switcher
5. **src/components/dashboard/ActivityFeed.tsx** - Real-time activity feed

## Next Steps

1. **Execute the migration** using one of the methods above
2. **Verify tables exist**: Check Supabase dashboard → Table Editor
3. **Test dashboard**: Navigate to http://localhost:8082
4. **Check stats populate**: Should see welcome/response/sequence/broadcast counts
5. **Monitor for errors**: Check browser console and Supabase logs

## Rollback Plan

If issues occur:

```sql
-- Drop new tables
DROP TABLE IF EXISTS page_configs CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- Old tables remain intact and can be used
```

## Support

If you encounter issues:
1. Check Supabase logs for error messages
2. Verify all old tables still exist: `welcome_messages`, `response_messages`, etc.
3. Check browser console for API errors
4. Verify migration file syntax is correct

---

**Created**: January 7, 2026
**Migration File**: `supabase/migrations/20260108_unified_message_architecture.sql`
**Status**: ⚠️ Migration pending execution

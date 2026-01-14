-- Migration: Change scheduled_time from TIME to TIME[] (array)
-- This allows storing multiple scheduled times for broadcasts

-- Step 1: Add new column for array of times
ALTER TABLE page_configs 
ADD COLUMN IF NOT EXISTS scheduled_times TIME[];

-- Step 2: Migrate existing scheduled_time to scheduled_times array
UPDATE page_configs
SET scheduled_times = ARRAY[scheduled_time]
WHERE scheduled_time IS NOT NULL 
  AND category = 'broadcast';

-- Step 3: Populate scheduled_times from delay_hours for all broadcast configs
UPDATE page_configs
SET scheduled_times = (
  SELECT array_agg(
    (LPAD((minutes / 60)::text, 2, '0') || ':' || 
     LPAD((minutes % 60)::text, 2, '0') || ':00')::time
  )
  FROM unnest(delay_hours) AS minutes
)
WHERE category = 'broadcast'
  AND delay_hours IS NOT NULL 
  AND array_length(delay_hours, 1) > 0;

-- Step 4: Keep scheduled_time as the first time for backward compatibility
UPDATE page_configs
SET scheduled_time = scheduled_times[1]
WHERE category = 'broadcast'
  AND scheduled_times IS NOT NULL
  AND array_length(scheduled_times, 1) > 0;

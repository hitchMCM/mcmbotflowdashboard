-- Add settings columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'dark',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'utc';

-- Add comment
COMMENT ON COLUMN users.theme IS 'User preferred theme: dark, light, or system';
COMMENT ON COLUMN users.language IS 'User preferred language: en, fr, es, ar';
COMMENT ON COLUMN users.timezone IS 'User preferred timezone';

-- Create users table for dashboard authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (password: admin123)
-- Note: In production, use proper password hashing
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@mcm.com', 'admin123', 'Admin MCM', 'admin')
ON CONFLICT (email) DO NOTHING;

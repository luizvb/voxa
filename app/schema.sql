CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recordings (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  name VARCHAR(255),
  duration_ms INT,
  size_bytes INT,
  mode VARCHAR(50),
  local_file_path TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id VARCHAR(255) REFERENCES recordings(id) ON DELETE CASCADE,
  provider VARCHAR(50),
  markdown TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id VARCHAR(255) REFERENCES recordings(id) ON DELETE CASCADE,
  json_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) REFERENCES users(id),
  resource_type VARCHAR(50), 
  provider VARCHAR(50), 
  quantity NUMERIC, 
  estimated_cost_usd NUMERIC(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Isolated AGENT/FAULT LIVE hosted data. 24-hour idle expiry enforced by service.
CREATE TABLE IF NOT EXISTS af_rooms (
 code VARCHAR(6) PRIMARY KEY,
 payload JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS af_rooms_updated_at ON af_rooms(updated_at);
CREATE TABLE IF NOT EXISTS af_usage (
 id BIGSERIAL PRIMARY KEY,
 at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 room VARCHAR(6) NOT NULL,
 model TEXT NOT NULL,
 outcome TEXT NOT NULL,
 input_tokens INTEGER NOT NULL DEFAULT 0,
 output_tokens INTEGER NOT NULL DEFAULT 0,
 cached_tokens INTEGER NOT NULL DEFAULT 0,
 estimated_usd NUMERIC(12,9) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS af_usage_at ON af_usage(at);
CREATE TABLE IF NOT EXISTS af_request_limits (
 bucket TEXT PRIMARY KEY,
 window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 requests INTEGER NOT NULL DEFAULT 0
);

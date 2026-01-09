-- News items table
CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    published_at TIMESTAMP NOT NULL,
    collected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}',
    sentiment NUMERIC(3, 2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_news_items_source ON news_items(source);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_collected_at ON news_items(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_tags ON news_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_news_items_url_hash ON news_items(MD5(url));

-- Collector statistics table
CREATE TABLE IF NOT EXISTS collector_stats (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    items_collected INTEGER NOT NULL DEFAULT 0,
    items_stored INTEGER NOT NULL DEFAULT 0,
    duplicates_skipped INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    last_run TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collector_stats_source ON collector_stats(source);
CREATE INDEX IF NOT EXISTS idx_collector_stats_last_run ON collector_stats(last_run DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_news_items_updated_at ON news_items;
CREATE TRIGGER update_news_items_updated_at
    BEFORE UPDATE ON news_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

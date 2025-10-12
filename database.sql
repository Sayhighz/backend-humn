-- ============================================
-- HUMN Database Schema
-- Voice Collection & Daily Anthem Platform
-- PostgreSQL 14+
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS TABLE
-- ============================================

CREATE TABLE users (
    -- Primary Key
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- World ID Authentication
    world_id VARCHAR(255) NOT NULL UNIQUE,
    nullifier_hash VARCHAR(255) NOT NULL UNIQUE,
    
    -- Profile Information
    username VARCHAR(100),
    email VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    
    -- Location
    country_code CHAR(2) NOT NULL,
    city VARCHAR(100),
    timezone VARCHAR(50),
    
    -- Status
    is_verified BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for users
CREATE INDEX idx_users_world_id ON users(world_id);
CREATE INDEX idx_users_country_code ON users(country_code);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_metadata ON users USING gin(metadata);

-- Comments
COMMENT ON TABLE users IS 'Verified users authenticated via World ID';
COMMENT ON COLUMN users.world_id IS 'World ID unique identifier';
COMMENT ON COLUMN users.nullifier_hash IS 'World ID nullifier hash for proof verification';

-- ============================================
-- 2. VOICE CONTRIBUTIONS TABLE
-- ============================================

CREATE TABLE voice_contributions (
    -- Primary Key
    contribution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    anthem_id VARCHAR(50) NOT NULL,
    
    -- Audio Information
    audio_url TEXT NOT NULL,
    audio_format VARCHAR(10) DEFAULT 'mp3',
    duration_ms INTEGER NOT NULL DEFAULT 5000,
    file_size_bytes BIGINT,
    
    -- Location Data
    country_code CHAR(2) NOT NULL,
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Processing Status
    status VARCHAR(20) DEFAULT 'uploaded',
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT chk_duration CHECK (duration_ms > 0 AND duration_ms <= 6000),
    CONSTRAINT chk_status CHECK (status IN ('uploaded', 'processing', 'processed', 'failed'))
);

-- Indexes for voice_contributions
CREATE INDEX idx_contributions_user_id ON voice_contributions(user_id);
CREATE INDEX idx_contributions_anthem_id ON voice_contributions(anthem_id);
CREATE INDEX idx_contributions_country_code ON voice_contributions(country_code);
CREATE INDEX idx_contributions_created_at ON voice_contributions(created_at DESC);
CREATE INDEX idx_contributions_recorded_at ON voice_contributions(recorded_at DESC);

-- Composite indexes
CREATE INDEX idx_contributions_user_date ON voice_contributions(user_id, recorded_at DESC);
CREATE INDEX idx_contributions_anthem_country ON voice_contributions(anthem_id, country_code);

-- Unique constraint: one contribution per user per day
CREATE UNIQUE INDEX idx_unique_user_daily_contribution 
ON voice_contributions(user_id, DATE(recorded_at AT TIME ZONE 'UTC'));

-- Comments
COMMENT ON TABLE voice_contributions IS '5-second voice recordings from users';
COMMENT ON COLUMN voice_contributions.anthem_id IS 'Format: anthem-YYYY-MM-DD';
COMMENT ON COLUMN voice_contributions.status IS 'Processing status: uploaded, processing, processed, failed';

-- ============================================
-- 3. DAILY ANTHEMS TABLE
-- ============================================

CREATE TABLE daily_anthems (
    -- Primary Key
    anthem_id VARCHAR(50) PRIMARY KEY,
    
    -- Date
    anthem_date DATE NOT NULL UNIQUE,
    
    -- Audio Information
    anthem_audio_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    audio_format VARCHAR(10) DEFAULT 'mp3',
    
    -- Statistics
    total_voices INTEGER DEFAULT 0,
    total_countries INTEGER DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    
    -- Generation Status
    status VARCHAR(20) DEFAULT 'collecting',
    generation_started_at TIMESTAMP WITH TIME ZONE,
    generation_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- AI Information
    ai_model VARCHAR(50),
    ai_parameters JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT chk_anthem_status CHECK (status IN ('collecting', 'processing', 'completed', 'failed')),
    CONSTRAINT chk_anthem_id_format CHECK (anthem_id ~ '^anthem-\d{4}-\d{2}-\d{2}$')
);

-- Indexes for daily_anthems
CREATE INDEX idx_anthems_date ON daily_anthems(anthem_date DESC);
CREATE INDEX idx_anthems_status ON daily_anthems(status);
CREATE INDEX idx_anthems_created_at ON daily_anthems(created_at DESC);
CREATE INDEX idx_anthems_total_voices ON daily_anthems(total_voices DESC);

-- Comments
COMMENT ON TABLE daily_anthems IS 'AI-generated daily world anthems';
COMMENT ON COLUMN daily_anthems.anthem_id IS 'Format: anthem-YYYY-MM-DD';
COMMENT ON COLUMN daily_anthems.status IS 'collecting, processing, completed, failed';

-- ============================================
-- 4. ANTHEM SEGMENTS TABLE
-- ============================================

CREATE TABLE anthem_segments (
    -- Primary Key
    segment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    anthem_id VARCHAR(50) NOT NULL REFERENCES daily_anthems(anthem_id) ON DELETE CASCADE,
    
    -- Country Information
    country_code CHAR(2) NOT NULL,
    country_name VARCHAR(100),
    
    -- Timing Information
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    sequence_order INTEGER NOT NULL,
    
    -- Statistics
    voice_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_segment_timing CHECK (end_time_ms > start_time_ms),
    CONSTRAINT chk_segment_duration CHECK (duration_ms = (end_time_ms - start_time_ms))
);

-- Indexes for anthem_segments
CREATE INDEX idx_segments_anthem_id ON anthem_segments(anthem_id);
CREATE INDEX idx_segments_country_code ON anthem_segments(country_code);
CREATE INDEX idx_segments_sequence ON anthem_segments(anthem_id, sequence_order);

-- Composite index for playback
CREATE INDEX idx_segments_playback ON anthem_segments(anthem_id, start_time_ms, end_time_ms);

-- Comments
COMMENT ON TABLE anthem_segments IS 'Country-based segments within each anthem';
COMMENT ON COLUMN anthem_segments.sequence_order IS 'Order of appearance in the anthem';

-- ============================================
-- 5. USER STATS TABLE
-- ============================================

CREATE TABLE user_stats (
    -- Primary Key
    stat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Contribution Stats
    total_contributions INTEGER DEFAULT 0,
    total_anthems_joined INTEGER DEFAULT 0,
    
    -- Streak Information
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_contribution_date DATE,
    
    -- Global Connection Stats
    countries_connected INTEGER DEFAULT 0,
    unique_countries_list CHAR(2)[] DEFAULT ARRAY[]::CHAR(2)[],
    
    -- Engagement Stats
    total_plays_received INTEGER DEFAULT 0,
    total_shares_received INTEGER DEFAULT 0,
    
    -- Rankings
    global_rank INTEGER,
    country_rank INTEGER,
    
    -- Timestamps
    first_contribution_at TIMESTAMP WITH TIME ZONE,
    last_contribution_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Detailed Breakdown
    country_breakdown JSONB DEFAULT '{}'::jsonb,
    monthly_breakdown JSONB DEFAULT '{}'::jsonb
);

-- Indexes for user_stats
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_user_stats_total_contributions ON user_stats(total_contributions DESC);
CREATE INDEX idx_user_stats_current_streak ON user_stats(current_streak DESC);
CREATE INDEX idx_user_stats_countries_connected ON user_stats(countries_connected DESC);
CREATE INDEX idx_user_stats_global_rank ON user_stats(global_rank) WHERE global_rank IS NOT NULL;

-- Comments
COMMENT ON TABLE user_stats IS 'Aggregated statistics for each user';
COMMENT ON COLUMN user_stats.unique_countries_list IS 'Array of country codes user has connected with';

-- ============================================
-- 6. COUNTRY STATS TABLE
-- ============================================

CREATE TABLE country_stats (
    -- Primary Key
    stat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    anthem_id VARCHAR(50) NOT NULL REFERENCES daily_anthems(anthem_id) ON DELETE CASCADE,
    
    -- Country Information
    country_code CHAR(2) NOT NULL,
    country_name VARCHAR(100),
    region VARCHAR(50),
    
    -- Statistics
    voice_count INTEGER DEFAULT 0,
    percentage DECIMAL(5, 2),
    total_duration_ms INTEGER DEFAULT 0,
    
    -- Rankings
    rank_in_anthem INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT uq_anthem_country UNIQUE(anthem_id, country_code)
);

-- Indexes for country_stats
CREATE INDEX idx_country_stats_anthem_id ON country_stats(anthem_id);
CREATE INDEX idx_country_stats_country_code ON country_stats(country_code);
CREATE INDEX idx_country_stats_voice_count ON country_stats(anthem_id, voice_count DESC);
CREATE INDEX idx_country_stats_region ON country_stats(region);

-- Comments
COMMENT ON TABLE country_stats IS 'Country-level statistics for each anthem';
COMMENT ON COLUMN country_stats.region IS 'Geographic region: Asia, Europe, Americas, Africa, Oceania';

-- ============================================
-- 7. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE notifications (
    -- Primary Key
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Notification Details
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Entities
    related_anthem_id VARCHAR(50),
    related_user_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_method VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT chk_notification_type CHECK (type IN (
        'anthem_ready', 'streak_milestone', 'new_follower', 
        'contribution_milestone', 'weekly_report', 'system_update'
    ))
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Comments
COMMENT ON TABLE notifications IS 'User notifications and alerts';
COMMENT ON COLUMN notifications.delivery_method IS 'push, email, in_app';

-- ============================================
-- 8. USER SETTINGS TABLE
-- ============================================

CREATE TABLE user_settings (
    -- Primary Key
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- App Settings
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'system',
    audio_quality VARCHAR(20) DEFAULT 'high',
    auto_play BOOLEAN DEFAULT true,
    
    -- Notification Preferences
    notifications_enabled BOOLEAN DEFAULT true,
    anthem_ready_notification BOOLEAN DEFAULT true,
    streak_reminder_notification BOOLEAN DEFAULT true,
    weekly_report_notification BOOLEAN DEFAULT false,
    milestone_notification BOOLEAN DEFAULT true,
    
    -- Privacy Settings
    show_profile BOOLEAN DEFAULT true,
    share_stats BOOLEAN DEFAULT true,
    show_country BOOLEAN DEFAULT true,
    allow_messaging BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_language CHECK (language IN ('en', 'th', 'es', 'fr', 'de', 'ja', 'zh', 'pt')),
    CONSTRAINT chk_theme CHECK (theme IN ('light', 'dark', 'system')),
    CONSTRAINT chk_audio_quality CHECK (audio_quality IN ('low', 'medium', 'high'))
);

-- Indexes for user_settings
CREATE INDEX idx_settings_user_id ON user_settings(user_id);

-- Comments
COMMENT ON TABLE user_settings IS 'User preferences and settings';

-- ============================================
-- 9. DOWNLOAD REQUESTS TABLE
-- ============================================

CREATE TABLE download_requests (
    -- Primary Key
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Requester Information
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    
    -- Request Details
    anthem_id VARCHAR(50) NOT NULL REFERENCES daily_anthems(anthem_id),
    purpose VARCHAR(100) NOT NULL,
    project_description TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    download_url TEXT,
    download_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(user_id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT chk_download_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired'))
);

-- Indexes for download_requests
CREATE INDEX idx_download_requests_user_id ON download_requests(user_id);
CREATE INDEX idx_download_requests_anthem_id ON download_requests(anthem_id);
CREATE INDEX idx_download_requests_status ON download_requests(status);
CREATE INDEX idx_download_requests_created_at ON download_requests(created_at DESC);

-- Comments
COMMENT ON TABLE download_requests IS 'Download requests from content creators';

-- ============================================
-- 10. DEVICE TOKENS TABLE (for Push Notifications)
-- ============================================

CREATE TABLE device_tokens (
    -- Primary Key
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Device Information
    device_token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL,
    device_name VARCHAR(100),
    app_version VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_platform CHECK (platform IN ('ios', 'android', 'web')),
    CONSTRAINT uq_device_token UNIQUE(device_token)
);

-- Indexes for device_tokens
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_is_active ON device_tokens(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE device_tokens IS 'Push notification device tokens';

-- ============================================
-- 11. AUDIT LOG TABLE (Optional but Recommended)
-- ============================================

CREATE TABLE audit_logs (
    -- Primary Key
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Actor
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Action
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for important actions';

-- ============================================
-- VIEWS
-- ============================================

-- View: Daily Summary
CREATE VIEW v_daily_summary AS
SELECT 
    da.anthem_date,
    da.anthem_id,
    da.status,
    da.total_voices,
    da.total_countries,
    COUNT(DISTINCT vc.user_id) as unique_users,
    STRING_AGG(DISTINCT vc.country_code, ', ' ORDER BY vc.country_code) as countries_list
FROM daily_anthems da
LEFT JOIN voice_contributions vc ON da.anthem_id = vc.anthem_id
GROUP BY da.anthem_date, da.anthem_id, da.status, da.total_voices, da.total_countries
ORDER BY da.anthem_date DESC;

COMMENT ON VIEW v_daily_summary IS 'Daily summary of anthems and contributions';

-- View: User Leaderboard
CREATE VIEW v_user_leaderboard AS
SELECT 
    u.user_id,
    u.username,
    u.country_code,
    us.total_contributions,
    us.current_streak,
    us.longest_streak,
    us.countries_connected,
    us.global_rank,
    RANK() OVER (PARTITION BY u.country_code ORDER BY us.total_contributions DESC) as country_rank
FROM users u
INNER JOIN user_stats us ON u.user_id = us.user_id
WHERE u.is_active = true
ORDER BY us.total_contributions DESC;

COMMENT ON VIEW v_user_leaderboard IS 'User leaderboard with rankings';

-- View: Country Performance
CREATE VIEW v_country_performance AS
SELECT 
    cs.country_code,
    cs.country_name,
    cs.region,
    COUNT(DISTINCT cs.anthem_id) as anthems_participated,
    SUM(cs.voice_count) as total_voices,
    AVG(cs.voice_count) as avg_voices_per_anthem,
    AVG(cs.percentage) as avg_percentage
FROM country_stats cs
GROUP BY cs.country_code, cs.country_name, cs.region
ORDER BY total_voices DESC;

COMMENT ON VIEW v_country_performance IS 'Country performance statistics across all anthems';

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Update user stats after contribution
CREATE OR REPLACE FUNCTION update_user_stats_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, total_contributions, last_contribution_date, first_contribution_at, last_contribution_at)
    VALUES (NEW.user_id, 1, DATE(NEW.recorded_at), NEW.recorded_at, NEW.recorded_at)
    ON CONFLICT (user_id) DO UPDATE SET
        total_contributions = user_stats.total_contributions + 1,
        last_contribution_date = DATE(NEW.recorded_at),
        last_contribution_at = NEW.recorded_at,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate and update streak
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_last_date DATE;
    v_current_date DATE;
BEGIN
    -- Get the latest contribution date
    SELECT MAX(DATE(recorded_at)) INTO v_last_date
    FROM voice_contributions
    WHERE user_id = p_user_id;
    
    -- If no contributions, return 0
    IF v_last_date IS NULL THEN
        RETURN 0;
    END IF;
    
    v_current_date := v_last_date;
    
    -- Count consecutive days
    WHILE EXISTS (
        SELECT 1 FROM voice_contributions
        WHERE user_id = p_user_id 
        AND DATE(recorded_at) = v_current_date
    ) LOOP
        v_streak := v_streak + 1;
        v_current_date := v_current_date - INTERVAL '1 day';
    END LOOP;
    
    -- Update user stats
    UPDATE user_stats
    SET 
        current_streak = v_streak,
        longest_streak = GREATEST(longest_streak, v_streak)
    WHERE user_id = p_user_id;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- Function: Update anthem statistics
CREATE OR REPLACE FUNCTION update_anthem_stats(p_anthem_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE daily_anthems
    SET 
        total_voices = (
            SELECT COUNT(*) 
            FROM voice_contributions 
            WHERE anthem_id = p_anthem_id
        ),
        total_countries = (
            SELECT COUNT(DISTINCT country_code) 
            FROM voice_contributions 
            WHERE anthem_id = p_anthem_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE anthem_id = p_anthem_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Update user stats on new contribution
CREATE TRIGGER trg_update_user_stats_on_contribution
AFTER INSERT ON voice_contributions
FOR EACH ROW
EXECUTE FUNCTION update_user_stats_on_contribution();

-- Trigger: Update updated_at on users
CREATE TRIGGER trg_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on daily_anthems
CREATE TRIGGER trg_update_anthems_updated_at
BEFORE UPDATE ON daily_anthems
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on user_settings
CREATE TRIGGER trg_update_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA - Countries Reference
-- ============================================

CREATE TABLE countries_reference (
    country_code CHAR(2) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    flag_emoji VARCHAR(10),
    timezone_primary VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

-- Insert major countries (sample)
INSERT INTO countries_reference (country_code, country_name, region, flag_emoji, timezone_primary) VALUES
('TH', 'Thailand', 'Asia', '🇹🇭', 'Asia/Bangkok'),
('US', 'United States', 'Americas', '🇺🇸', 'America/New_York'),
('IN', 'India', 'Asia', '🇮🇳', 'Asia/Kolkata'),
('BR', 'Brazil', 'Americas', '🇧🇷', 'America/Sao_Paulo'),
('GB', 'United Kingdom', 'Europe', '🇬🇧', 'Europe/London'),
('JP', 'Japan', 'Asia', '🇯🇵', 'Asia/Tokyo'),
('DE', 'Germany', 'Europe', '🇩🇪', 'Europe/Berlin'),
('FR', 'France', 'Europe', '🇫🇷', 'Europe/Paris'),
('AU', 'Australia', 'Oceania', '🇦🇺', 'Australia/Sydney'),
('CN', 'China', 'Asia', '🇨🇳', 'Asia/Shanghai'),
('MX', 'Mexico', 'Americas', '🇲🇽', 'America/Mexico_City'),
('NG', 'Nigeria', 'Africa', '🇳🇬', 'Africa/Lagos'),
('ZA', 'South Africa', 'Africa', '🇿🇦', 'Africa/Johannesburg'),
('KR', 'South Korea', 'Asia', '🇰🇷', 'Asia/Seoul'),
('ES', 'Spain', 'Europe', '🇪🇸', 'Europe/Madrid');

COMMENT ON TABLE countries_reference IS 'Reference data for countries';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_contributions_user_anthem ON voice_contributions(user_id, anthem_id);
CREATE INDEX idx_segments_anthem_sequence ON anthem_segments(anthem_id, sequence_order);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;

-- ============================================
-- PARTITIONING (Optional - for scale)
-- ============================================

-- Partition voice_contributions by month (if expecting high volume)
/*
CREATE TABLE voice_contributions_template (
    LIKE voice_contributions INCLUDING ALL
) PARTITION BY RANGE (recorded_at);

-- Create partitions for each month
CREATE TABLE voice_contributions_2025_10 PARTITION OF voice_contributions_template
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE voice_contributions_2025_11 PARTITION OF voice_contributions_template
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
*/

-- ============================================
-- GRANT PERMISSIONS (Sample)
-- ============================================

-- Create application user
-- CREATE USER humn_app WITH PASSWORD 'secure_password_here';

-- Grant permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO humn_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO humn_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO humn_app;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Clean up expired notifications
-- DELETE FROM notifications WHERE expires_at < CURRENT_TIMESTAMP;

-- Clean up old audit logs (keep last 90 days)
-- DELETE FROM audit_logs WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

-- Vacuum and analyze for performance
-- VACUUM ANALYZE;

-- ============================================
-- USEFUL QUERIES FOR MONITORING
-- ============================================

-- Check table sizes
/*
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/

-- Check index usage
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
*/

-- ============================================
-- BACKUP RECOMMENDATIONS
-- ============================================

/*
-- Full backup
pg_dump -U postgres -d humn_db -F c -b -v -f humn_backup_$(date +%Y%m%d).dump

-- Restore
pg_restore -U postgres -d humn_db -v humn_backup_20251009.dump
*/

-- ============================================
-- END OF SCHEMA
-- ============================================

COMMENT ON DATABASE humn_db IS 'HUMN - Voice Collection Platform Database';
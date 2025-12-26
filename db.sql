CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION "pg_cron"; -- only do THIS ONE EXTENSION on your selected database for PG_CRON extension

CREATE TABLE player(
    player_id VARCHAR(100) PRIMARY KEY,
    player_name TEXT NOT NULL,
    location_code JSONB,
    location GEOMETRY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    associated_player_id REFERENCES player(player_id) ON DELETE SET NULL
);
CREATE INDEX idx_player_name_trgm ON player USING gin (player_name gin_trgm_ops);

CREATE TABLE player_activity(
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE,
    event_name VARCHAR(10) NOT NULL,
    event_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE community(
    community_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_name TEXT,
    community_icon_url TEXT
);
CREATE TABLE server_browser(
    ip TEXT NOT NULL,
    port SMALLINT NOT NULL,
    tracking BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(ip, port)
);
CREATE TABLE server(
    server_id VARCHAR(100) PRIMARY KEY,
    server_name TEXT,
    server_ip VARCHAR(20),
    server_fullname TEXT,
    server_port INTEGER,
    max_players SMALLINT,
    online BOOLEAN DEFAULT false,
    community_id UUID REFERENCES community(community_id) ON DELETE SET NULL,
    readable_link VARCHAR(20) UNIQUE,
);

CREATE TABLE server_metadata(
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE,
    server_website VARCHAR(500),
    server_discord_link VARCHAR(100),
    server_source VARCHAR(100),
    source_by_id BOOLEAN DEFAULT FALSE
);
CREATE TABLE player_admin(
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE,
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE,
    UNIQUE(player_id, server_id)
);
CREATE TABLE player_server_activity(
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE,
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE,
    event_name VARCHAR(10) NOT NULL,
    event_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE discord_user(
    user_id BIGINT PRIMARY KEY,
    display_name VARCHAR(100),
    avatar TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_user(
    user_id BIGINT REFERENCES discord_user ON DELETE CASCADE,
    player_id VARCHAR(100) REFERENCES player ON DELETE CASCADE,
    UNIQUE(user_id, player_id)
);

CREATE TABLE admin_join_mention(
    user_id BIGINT REFERENCES discord_user(user_id) ON DELETE CASCADE,
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE,
    guild_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, guild_id, server_id)
);

CREATE TABLE server_map_played(
    time_id SERIAL PRIMARY KEY,
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE,
    map VARCHAR(100) NOT NULL,
    player_count INT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_sm_server_time ON server_map_played(server_id, started_at, ended_at);
CREATE INDEX idx_smp_timerange ON server_map_played
    USING gist (server_id, map, tstzrange(started_at, ended_at));


-- REQUIRED FORCE AS RELYING ON A PROCESS IS UNRELIABLE
CREATE OR REPLACE FUNCTION close_previous_maps()
RETURNS TRIGGER AS $$
BEGIN
UPDATE server_map_played
SET ended_at = CURRENT_TIMESTAMP
WHERE server_id = NEW.server_id
  AND ended_at IS NULL;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_close_previous_maps
    BEFORE INSERT ON server_map_played
    FOR EACH ROW
    EXECUTE FUNCTION close_previous_maps();


CREATE TABLE admin_info(
    admin_id BIGINT PRIMARY KEY,
    admin_name VARCHAR(1000) NOT NULL,
    avatar_id VARCHAR(1000),
    permissions BIGINT,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE server_infractions(
    infraction_id VARCHAR(100) NOT NULL,
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    created TIMESTAMP WITH TIME ZONE NOT NULL,
    message_url TEXT,
    pending_update BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE player_server_session(
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE NOT NULL,
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_pss_timerange ON player_server_session
    USING gist (server_id, tstzrange(started_at, ended_at));

CREATE INDEX idx_session_times
    ON player_server_session (started_at, ended_at);

CREATE INDEX idx_player_id
    ON player_server_session (player_id);

CREATE INDEX idx_player_server_session_server_id_player_id_started_ended
    ON player_server_session (server_id, player_id, started_at, ended_at);

CREATE INDEX idx_player_server_session_started_at
    ON player_server_session (started_at);


CREATE SCHEMA website;

CREATE TABLE website.discord_user(
    user_id BIGINT PRIMARY KEY REFERENCES discord_user(user_id) ON DELETE CASCADE NOT NULL,
    refresh_token TEXT
);

CREATE TYPE community_visibility_state_enum AS ENUM (
    'Private',
    'Public'
);

CREATE TYPE persona_state_enum AS ENUM (
    'Offline',
    'Online',
    'Busy',
    'Away',
    'Snooze',
    'LookingToTrade',
    'LookingToPlay'
);


CREATE TABLE website.steam_user (
    user_id BIGINT PRIMARY KEY,
    community_visibility_state community_visibility_state_enum NOT NULL,
    profile_state INTEGER NOT NULL,
    persona_name TEXT NOT NULL,
    profile_url TEXT NOT NULL,
    avatar TEXT NOT NULL,
    avatar_medium TEXT NOT NULL,
    avatar_full TEXT NOT NULL,
    avatar_hash TEXT NOT NULL,
    last_log_off BIGINT NOT NULL,
    persona_state persona_state_enum NOT NULL,
    primary_clan_id TEXT NOT NULL,
    time_created BIGINT NOT NULL,
    persona_state_flags INTEGER NOT NULL,
    comment_permission BOOLEAN NOT NULL
);

CREATE TABLE website.user_favorite_maps (
    user_id BIGINT REFERENCES website.steam_user(user_id) ON DELETE CASCADE,
    server_id VARCHAR(100),
    map TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, server_id, map),
    FOREIGN KEY (server_id, map)
        REFERENCES server_map(server_id, map)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS website.user_refresh_tokens (
    user_id BIGINT PRIMARY KEY REFERENCES discord_user(user_id) ON DELETE CASCADE NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT current_timestamp,
    device_id TEXT NOT NULL,
    UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
    ON website.user_refresh_tokens(expires_at);

CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
    RETURNS INTEGER AS $$
    DECLARE
    deleted_count INTEGER;
    BEGIN
        DELETE FROM website.user_refresh_tokens
        WHERE expires_at < NOW();

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
    END;
$$ LANGUAGE plpgsql;


CREATE TABLE website.player_server_worker(
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE NOT NULL,
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(30) NOT NULL,
    last_calculated UUID REFERENCES player_server_session(session_id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY(player_id, server_id, type)
);
CREATE TABLE website.player_server_relationship(
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE NOT NULL,
    meet_player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE NOT NULL,
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE NOT NULL,
    total_time_together INTERVAL DEFAULT INTERVAL '0 seconds',
    last_seen TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY(player_id, meet_player_id, server_id)
);

CREATE TABLE website.player_playtime(
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE NOT NULL,
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE NOT NULL,
    total_playtime INTERVAL NOT NULL DEFAULT INTERVAL '0 seconds',
    casual_playtime INTERVAL NOT NULL DEFAULT INTERVAL '0 seconds',
    tryhard_playtime INTERVAL NOT NULL DEFAULT INTERVAL '0 seconds',
    category VARCHAR(8),
    sum_key TEXT,
    PRIMARY KEY(player_id, server_id)
);

CREATE TABLE website.player_map_time(
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE NOT NULL,
    player_id VARCHAR(100) REFERENCES player(player_id) ON DELETE CASCADE NOT NULL,
    map VARCHAR(100) NOT NULL,
    total_playtime INTERVAL NOT NULL DEFAULT INTERVAL '0 seconds',
    PRIMARY KEY(player_id, server_id, map)
);

CREATE TABLE website.map_analyze(
    server_id VARCHAR(100),
    map TEXT,
    total_playtime INTERVAL NOT NULL DEFAULT INTERVAL '0 seconds',
    total_sessions INT NOT NULL DEFAULT 0,
    unique_players INT NOT NULL DEFAULT 0,
    cum_player_hours INTERVAL NOT NULL DEFAULT INTERVAL '0 seconds',
    last_played TIMESTAMP WITH TIME ZONE NOT NULL,
    last_played_ended TIMESTAMP WITH TIME ZONE,
    dropoff_rate DOUBLE PRECISION DEFAULT 0,
    avg_playtime_before_quitting INTERVAL NOT NULL DEFAULT INTERVAL '0 seconds',
    avg_players_per_session DOUBLE PRECISION DEFAULT 0,
    PRIMARY KEY (server_id, map),
    FOREIGN KEY (server_id, map) REFERENCES server_map(server_id, map) ON DELETE CASCADE
);
CREATE TABLE website.user_favorite_maps (
    user_id BIGINT REFERENCES discord_user(user_id),
    server_id VARCHAR(100),
    map TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, server_id, map),
    FOREIGN KEY (server_id, map)
        REFERENCES server_map(server_id, map)
        ON DELETE CASCADE
);

CREATE TABLE website.map_session_distribution(
    server_id VARCHAR(100),
    map TEXT,
    session_range TEXT,
    session_count INT NOT NULL,
    PRIMARY KEY (server_id, map, session_range),
    FOREIGN KEY (server_id, map) REFERENCES server_map(server_id, map) ON DELETE CASCADE
);

CREATE TABLE website.announce(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT current_timestamp,
    show BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE MATERIALIZED VIEW website.player_playtime_ranks AS
SELECT player_id,
       server_id,
       RANK() OVER (ORDER BY total_playtime DESC) AS global_playtime_rank,
       RANK() OVER (PARTITION BY server_id ORDER BY total_playtime DESC) AS playtime_rank,
       RANK() OVER (PARTITION BY server_id ORDER BY casual_playtime DESC) AS casual_rank,
       RANK() OVER (PARTITION BY server_id ORDER BY tryhard_playtime DESC) AS tryhard_rank
FROM website.player_playtime;

CREATE UNIQUE INDEX CONCURRENTLY player_playtime_ranks_idx
    ON website.player_playtime_ranks (player_id, server_id);


CREATE MATERIALIZED VIEW website.player_map_rank AS
SELECT
    server_id,
    player_id,
    map,
    RANK() OVER (
    PARTITION BY server_id, map
    ORDER BY total_playtime DESC
  ) AS map_rank
FROM website.player_map_time;
CREATE UNIQUE INDEX CONCURRENTLY player_map_rank_idx
    ON website.player_map_rank (server_id, map, player_id);

CREATE TABLE website.user_roles (
    user_id BIGINT REFERENCES website.steam_user(user_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('superuser', 'community_admin', 'regular')),
    community_id UUID REFERENCES community(community_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, community_id),
    CONSTRAINT role_community_check CHECK (
        (role = 'community_admin' AND community_id IS NOT NULL) OR
        (role IN ('superuser', 'regular') AND community_id IS NULL)
        )
);

CREATE INDEX idx_user_roles_user_id ON website.user_roles(user_id);
CREATE INDEX idx_user_roles_community ON website.user_roles(community_id) WHERE community_id IS NOT NULL;

CREATE TABLE website.user_anonymization (
    user_id BIGINT REFERENCES website.steam_user(user_id) ON DELETE CASCADE,
    community_id UUID REFERENCES community(community_id) ON DELETE CASCADE,
    anonymized BOOLEAN NOT NULL DEFAULT FALSE,
    hide_location BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, community_id)
);

CREATE INDEX idx_user_anonymization_user ON website.user_anonymization(user_id);
CREATE INDEX idx_user_anonymization_community ON website.user_anonymization(community_id);

CREATE OR REPLACE FUNCTION update_anonymization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_anonymization_timestamp
    BEFORE UPDATE ON website.user_anonymization
    FOR EACH ROW
    EXECUTE FUNCTION update_anonymization_timestamp();

CREATE OR REPLACE FUNCTION website.is_superuser(check_user_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
RETURN EXISTS (
    SELECT 1 FROM website.user_roles
    WHERE user_id = check_user_id AND role = 'superuser'
);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION website.is_community_admin(check_user_id BIGINT, check_community_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
RETURN EXISTS (
    SELECT 1 FROM website.user_roles
    WHERE user_id = check_user_id
      AND role = 'community_admin'
      AND community_id = check_community_id
);
END;
$$ LANGUAGE plpgsql;



CREATE TABLE map_metadata(
    name VARCHAR(100) PRIMARY KEY,
    workshop_id BIGINT NOT NULL,
    image_url TEXT,
    creators VARCHAR(100),
    file_bytes BIGINT
);

CREATE TABLE map_music (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    music_name TEXT NOT NULL UNIQUE,
    duration TEXT,
    youtube_music TEXT,
    source TEXT NOT NULL,
    tried_searching BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE associated_map_music (
    id SERIAL PRIMARY KEY,
    map_music_id UUID NOT NULL REFERENCES map_music(id) ON DELETE CASCADE,
    map_name TEXT NOT NULL,
    tags TEXT[] NOT NULL
);

CREATE TABLE server_player_counts (
    server_id VARCHAR(100),
    bucket_time TIMESTAMP WITH TIME ZONE,
    player_count INT,
    PRIMARY KEY (server_id, bucket_time)
);
CREATE INDEX idx_server_bucket_time_desc
    ON server_player_counts (server_id, bucket_time DESC);

CREATE TABLE server_map
(
    server_id VARCHAR(100) NOT NULL REFERENCES server(server_id) ON DELETE CASCADE,
    map text NOT NULL,
    first_occurrence timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cleared_at timestamp with time zone,
    is_tryhard boolean,
    is_casual boolean,
    cooldown DOUBLE PRECISION,
    current_cooldown TIMESTAMP WITH TIME ZONE,
    pending_cooldown boolean DEFAULT FALSE,
    no_noms boolean NOT NULL DEFAULT FALSE,
    workshop_id BIGINT,
    resolved_workshop_id BIGINT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_players SMALLINT DEFAULT 0,
    max_players SMALLINT,
    PRIMARY KEY (server_id, map)
);
CREATE TABLE region_time (
    region_id SMALLSERIAL PRIMARY KEY,
    region_name VARCHAR(20) NOT NULL,
    start_time TIME WITH TIME ZONE NOT NULL,
    end_time TIME WITH TIME ZONE NOT NULL
);
CREATE TABLE match_data(
    time_id integer REFERENCES server_map_played(time_id) ON DELETE SET NULL,
    extend_count SMALLINT DEFAULT 0,
    zombie_score SMALLINT NOT NULL,
    human_score SMALLINT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    server_id VARCHAR(100) REFERENCES server(server_id) ON DELETE CASCADE,
    estimated_time_end TIMESTAMP WITH TIME ZONE,
    server_time_end TIMESTAMP WITH TIME ZONE
);
CREATE TABLE day_night (
    zone VARCHAR(10),
    geometry geometry
);

CREATE OR REPLACE FUNCTION get_server_player_counts(server_id TEXT)
RETURNS TABLE (
    server_id TEXT,
    bucket_time TIMESTAMP,
    player_count INTEGER
) AS $$
WITH vars AS (
    SELECT
        date_trunc('minute', COALESCE((
            SELECT MAX(bucket_time) FROM server_player_counts
            WHERE server_player_counts.server_id = get_server_player_counts.server_id LIMIT 1
        ), (
            SELECT MIN(started_at) FROM player_server_session
            WHERE player_server_session.server_id = get_server_player_counts.server_id LIMIT 1
        ))) AS start_time,
        date_trunc('minute', now()) AS end_time
),
time_buckets AS (
    SELECT generate_series(
        (SELECT start_time FROM vars),
        (SELECT end_time FROM vars),
        '1 minute'::interval
    ) AS bucket_time
),
filtered_sessions AS (
    SELECT *
    FROM player_server_session pss
    WHERE pss.server_id = get_server_player_counts.server_id
      AND pss.started_at <= (SELECT end_time FROM vars)
      AND (pss.ended_at >= (SELECT start_time FROM vars) OR (
          pss.ended_at IS NULL AND (now() - pss.started_at) < INTERVAL '12 hours'
      ))
),
historical_counts AS (
    SELECT
        tb.bucket_time,
        ps.server_id,
        COUNT(DISTINCT ps.player_id) AS player_count
    FROM time_buckets tb
    LEFT JOIN filtered_sessions ps
        ON tb.bucket_time >= ps.started_at
        AND tb.bucket_time <= COALESCE(ps.ended_at - INTERVAL '3 minutes', tb.bucket_time)
    GROUP BY tb.bucket_time, ps.server_id
)
SELECT
    COALESCE(server_id, get_server_player_counts.server_id),
    bucket_time,
    LEAST(player_count, 64)
FROM historical_counts;
$$ LANGUAGE SQL STABLE;


CREATE OR REPLACE FUNCTION notify_player_activity() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('player_activity', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_table_player_activity
    AFTER INSERT ON player_server_activity
    FOR EACH ROW EXECUTE FUNCTION notify_player_activity();

CREATE OR REPLACE FUNCTION notify_map_activity() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('map_changed', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_table_map_activity
    AFTER INSERT ON server_map_played
    FOR EACH ROW EXECUTE FUNCTION notify_map_activity();


CREATE OR REPLACE FUNCTION notify_map_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('map_update', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_table_map_update
    AFTER UPDATE ON server_map_played
    FOR EACH ROW EXECUTE FUNCTION notify_map_update();


CREATE OR REPLACE FUNCTION notify_infraction_new() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('infraction_new', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_table_infraction_new
    AFTER INSERT ON server_infractions
    FOR EACH ROW EXECUTE FUNCTION notify_infraction_new();

CREATE OR REPLACE FUNCTION notify_infraction_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('infraction_update', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_table_infraction_update
    AFTER UPDATE ON server_infractions
    FOR EACH ROW EXECUTE FUNCTION notify_infraction_update();

CREATE VIEW player_server_mapped AS
SELECT
    DISTINCT p.player_id,
    p.player_name,
    p.created_at,
    pss.started_at,
    p.location,
    pss.session_id,
    pss.server_id,
    p.location_code ->> 'country' AS location_country
        FROM player_server_session pss
        JOIN player p ON p.player_id = pss.player_id
        WHERE pss.ended_at IS NULL
        AND CURRENT_TIMESTAMP - pss.started_at < INTERVAL '1 DAY'
        AND p.location IS NOT NULL;

CREATE MATERIALIZED VIEW player_server_timed AS
SELECT
    pss.session_id AS fid,
    p.player_id,
    p.player_name,
    p.created_at,
    pss.started_at,
    pss.ended_at,
    pss.server_id,
    p.location_code ->> 'country'::text AS location_country,
    p.location AS geometry
FROM player_server_session pss
    JOIN player p ON p.player_id::text = pss.player_id::text
WHERE p.location IS NOT NULL;

CREATE SCHEMA legacy_gfl;
CREATE TABLE legacy_gfl.players (
    steamid64 VARCHAR(19) PRIMARY KEY,
    points DOUBLE PRECISION DEFAULT 0,
    human_time BIGINT DEFAULT 0,
    zombie_time BIGINT DEFAULT 0,
    zombie_killed INTEGER DEFAULT 0,
    headshot INTEGER DEFAULT 0,
    infected_time INTEGER DEFAULT 0,
    item_usage INTEGER DEFAULT 0,
    boss_killed INTEGER DEFAULT 0,
    leader_count INTEGER DEFAULT 0,
    td_count INTEGER DEFAULT 0,
    personaname TEXT DEFAULT '',
    avatarURL VARCHAR(255) DEFAULT '',
    timestamp TIMESTAMP DEFAULT NULL
);

CREATE SCHEMA layers;
-- everything after this part, require PostGIS manual importing through QGIS

CREATE VIEW countries_counted AS
SELECT
    c."NAME" as "name", COUNT(DISTINCT p.player_id) as player_count, c.geom as geometry
FROM layers.countries_fixed AS c
         LEFT JOIN player_server_mapped AS p
          ON c."ISO_A2_EH" = p.location_country OR
             ST_Within(p.location, c.geom)
GROUP BY
    c."NAME", c.geom;


--------------------------------------------------------------------------------------
-- everything after this part require pg_cron, ensure to install them


SELECT cron.schedule_in_database(
    'update-player-counts',
    '*/5 * * * *',  -- Every 5 minutes
    $$
        INSERT INTO server_player_counts (server_id, bucket_time, player_count)
        SELECT s.server_id, g.bucket_time, g.player_count
                       FROM server s
        JOIN LATERAL get_server_player_counts(s.server_id) AS g ON TRUE
        ON CONFLICT (server_id, bucket_time) DO UPDATE
        SET player_count = EXCLUDED.player_count;
    $$,
    'cs2_tracker_db'  -- INSERT YOUR DB NAME
);


SELECT cron.schedule_in_database(
    'cleanup-expired-refresh-tokens',
    '0 0 * * *',                        -- every day at midnight
    $$
        SELECT cleanup_expired_refresh_tokens();
    $$,
    'cs2_tracker_db' -- INSERT YOUR DB NAME
);

SELECT cron.schedule_in_database(
    'update-player-timed',
    '*/10 * * * *',  -- Every 10 minutes
    $$
        REFRESH MATERIALIZED VIEW player_server_timed;
    $$,
  'cs2_tracker_db'  -- INSERT YOUR DB NAME
);



SELECT cron.schedule_in_database(
    'update-player-map-rank',
    '0 0 * * *',
    $$
        REFRESH MATERIALIZED VIEW CONCURRENTLY website.player_map_rank;
    $$,
    'cs2_tracker_db'
);


SELECT cron.schedule_in_database(
    'update-player-play-rank',
    '0 0 * * *',  -- Every day
    $$
        REFRESH MATERIALIZED VIEW CONCURRENTLY website.player_playtime_ranks;
    $$,
    'cs2_tracker_db'  -- INSERT YOUR DB NAME
);
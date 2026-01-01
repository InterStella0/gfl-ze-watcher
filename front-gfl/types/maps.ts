export type MapImage = {
    map_name: string,
    small: string,
    medium: string,
    large: string,
    extra_large: string,
}

export type ServerMapMatch = {
    time_id: number,
    server_id: string,
    map: string,
    player_count: number,
    started_at: string,
    zombie_score: number | null,
    human_score: number | null,
    occurred_at: string | null,
    estimated_time_end: string | null,
    server_time_end: string | null,
    extend_count: number | null,
}

type MapInfo = {
    name: string,
    first_occurrence: string,
    cleared_at: string | null,
    is_tryhard: boolean,
    is_casual: boolean,
    current_cooldown: string | null,
    pending_cooldown: boolean,
    no_noms: boolean,
    enabled: boolean,
    min_players: number,
    max_players: number,
    workshop_id: number,
    creators: string | null,
    file_bytes: number | null,
    removed: boolean,
}
type MapAnalyze = {
    map: string,
    unique_players: number,
    cum_player_hours: number,
    total_playtime: number,
    total_sessions: number,
    avg_playtime_before_quitting: number,
    dropoff_rate: number,
    last_played: string,
    last_played_ended: string | null,
    avg_players_per_session: number,
}
export type ServerMapDetail = {
    name: string,
    analyze: MapAnalyze | null,
    notReady: boolean,
    info: MapInfo | null
}
export interface ServerMap {
    map: string,
    server_id: string,
}

export interface ServerMapPlayed extends ServerMap {
    time_id: number,
    player_count: number,
    started_at: string,
    ended_at: string | null,
}

export type ServerMapPlayedPaginated = {
    total_sessions: number,
    maps: ServerMapPlayed[],
}

export type MapSessionMatch = {
    time_id: number,
    server_id: string,
    zombie_score: number,
    human_score: number,
    occurred_at: string
}
export type MapRegion = {
    region_name: string,
    total_play_duration: number
}
export type DailyMapRegion = {
    date: string,
    regions: MapRegion[]
}
export type MapSessionDistribution = {
    session_range: string,
    session_count: number,
}
export type MapPlayed = {
    map: string,
    first_occurrence: string
    cooldown: string | null,
    pending_cooldown: boolean,
    enabled: boolean,
    is_tryhard: boolean | null,
    is_casual: boolean | null,
    is_favorite: boolean | null,
    cleared_at: string | null,
    total_time: number,
    total_sessions: number,
    last_played: string | null,
    last_played_ended: string | null,
    last_session_id: number,
    unique_players: number,
    total_cum_time: number,
    removed: boolean
}
export type MapPlayedPaginated = {
    total_maps: number,
    maps: MapPlayed[]
}


export type MapMusicTrack = {
    id: string;
    title: string;
    artist?: string;
    duration: number;
    contexts: string[];
    youtubeVideoId: string | null;
    otherMaps: string[]
    source: string
}

export interface ServerMapMusic{
    id: string,
    name: string,
    duration: number,
    youtube_music: string | null,
    source: string,
    tags: string[],
    other_maps: string[]
}
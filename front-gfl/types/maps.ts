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


export type ServerMapPlayed = {
    time_id: number,
    server_id: string,
    map: string,
    player_count: number,
    started_at: string,
    ended_at: string | null,
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

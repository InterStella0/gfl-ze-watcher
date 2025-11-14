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
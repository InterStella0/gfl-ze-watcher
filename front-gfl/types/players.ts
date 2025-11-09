export type RankMode = "Casual" | "TryHard" | "Total"
export interface RankingMode {
    id: string,
    label: string,
    value: RankMode
}
export interface PlayerTableRank{
    rank: number,
    id: string,
    name: string,
    tryhard_playtime: number,
    casual_playtime: number,
    total_playtime: number
}
export interface PlayerBrief{
    id: string,
    name: string,
    created_at: string,
    total_playtime: number,
    rank: number,
    online_since: string | null,
    last_played: string,
    last_played_duration: number,
}
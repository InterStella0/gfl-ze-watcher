export interface FetchStatusEntry {
    fetch_id: number;
    server_id: string;
    server_name: string;
    community_id: string;
    community_name: string;
    op_name: string;
    source_name: string;
    fetched_at: string;
    ok: boolean;
    error: string | null;
}

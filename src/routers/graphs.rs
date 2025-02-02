
// TODO: 
// 1. Show player counts for the whole history.
// 2. Show player sessions
// 3. Show infractions

use chrono::{DateTime, Utc};
use poem_openapi::{Object, OpenApi};


#[derive(Object)]
struct ServerCountData{
    time: DateTime<Utc>,
    player_count: u8
}


enum ServerUniqueGraph{

}

pub struct GraphApi;

#[OpenApi]
impl GraphApi {
    #[oai(path = "/graph/:server_id/unique_player", method = "get")]
    async fn get_server_graph_unique(&self) {
        todo!()
    }
    #[oai(path = "/graph/:server_id/map", method = "get")]
    async fn get_server_graph_map(&self) {
        // TODO: MAX OF 2 weeks
        todo!()
    }
    #[oai(path = "/graph/:server_id/infractions", method = "get")]
    async fn get_server_graph_infractions(&self) {
        // TODO: MAX OF 2 weeks
        todo!()
    }
}




/*
	WITH vars AS (
	    SELECT
	        date_trunc('minute', (SELECT MAX(bucket_time) FROM server_player_counts LIMIT 1)) AS start_time,
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
	    WHERE pss.started_at <= (SELECT end_time FROM vars)
	    AND (pss.ended_at >= (SELECT start_time FROM vars) OR pss.ended_at IS NULL)
	),
	historical_counts AS (
	    SELECT
	        tb.bucket_time,
	        ps.server_id,
	        COUNT(DISTINCT ps.player_id) AS player_count
	    FROM time_buckets tb
	    LEFT JOIN filtered_sessions ps
	        ON tb.bucket_time >= ps.started_at
	        AND tb.bucket_time <= COALESCE(ps.ended_at, tb.bucket_time)
	        AND ps.server_id = '65bdad6379cefd7ebcecce5c'
	    GROUP BY tb.bucket_time, ps.server_id
	)
	SELECT COALESCE(server_id, '65bdad6379cefd7ebcecce5c'), bucket_time, player_count
	FROM historical_counts

*/
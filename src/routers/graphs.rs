
// TODO: 
// 1. Show player counts for the whole history.
// 2. Show player sessions
// 3. Show infractions

use chrono::{DateTime, Utc};
use poem_openapi::{param::{Path, Query}, payload::Json, Object, OpenApi};

use poem::web::Data;
use sqlx::{Pool, Postgres};
use crate::{model::{DbServer, DbServerCountData, GenericResponse as Response, ResponseObject}, utils::ChronoToTime, AppData};


#[derive(Object)]
pub struct ServerCountData{
    pub bucket_time: DateTime<Utc>,
    pub player_count: i32
}

pub struct GraphApi;

#[OpenApi]
impl GraphApi {
	fn retain_peaks<T: PartialEq + Clone>(
        &self, points: Vec<T>,
        max_points: usize,
        comp_max: impl Fn(&T, &T) -> bool,
        comp_min: impl Fn(&T, &T) -> bool,
    ) -> Vec<T> {
        let total_points = points.len();
        if total_points <= max_points {
            return points;
        }

        let interval_size = (total_points as f64 / max_points as f64).ceil() as usize;
        let mut result: Vec<T> = Vec::with_capacity(max_points);

        for chunk in points.chunks(interval_size) {
            if chunk.is_empty() {
                continue;
            }

            let mut max_point = &chunk[0];
            let mut min_point = &chunk[0];

            for point in chunk.iter() {
                if comp_max(point, max_point) {
                    max_point = point;
                }
                if comp_min(point, max_point) {
                    min_point = point;
                }
            }

            result.push(chunk[0].clone());
            if min_point != &chunk[0] && min_point != &chunk[chunk.len() - 1] {
                result.push(min_point.clone());
            }
            if max_point != &chunk[0] && max_point != &chunk[chunk.len() - 1] {
                result.push(max_point.clone());
            }
            if chunk.len() > 1 {
                result.push(chunk[chunk.len() - 1].clone()); // Last point
            }
        }
        result
    }

	pub async fn get_server(&self, pool: &Pool<Postgres>, server_id: &str) -> Option<DbServer>{
		sqlx::query_as!(DbServer, "SELECT * FROM server WHERE server_id=$1 LIMIT 1", server_id)
			.fetch_one(pool)
			.await
			.ok()
	}
    #[oai(path = "/graph/:server_id/unique_players", method = "get")]
    async fn get_server_graph_unique(
		&self, data: Data<&AppData>, server_id: Path<String>, start: Query<DateTime<Utc>>, end: Query<DateTime<Utc>>
	) -> Response<Vec<ServerCountData>> {
		let pool = &data.0.pool;
		let Some(server) = self.get_server(pool, &server_id.0).await else {
			todo!()
		};

		let Ok(result) = sqlx::query_as!(DbServerCountData, 
			"SELECT * FROM server_player_counts WHERE 
			server_id=$1 AND bucket_time >= $2 AND bucket_time <= $3", 
			server_id.0, start.0.to_db_time(), end.0.to_db_time()
		)
		.fetch_all(pool)
		.await else {
			todo!()
		};
		let result = self.retain_peaks(result, 2_500, 
			|left, maxed| left.player_count > maxed.player_count, 
			|left, min| left.player_count < min.player_count, 
		);
	 	let response: Vec<ServerCountData> =	result
			.into_iter()
			.map(|e| e.into())
			.collect();
		Response::Ok(Json(ResponseObject::ok(response)))	
    }
    #[oai(path = "/graph/:server_id/map", method = "get")]
    async fn get_server_graph_map(&self, data: Data<&AppData>) {
        // TODO: MAX OF 2 weeks
        todo!()
    }
    #[oai(path = "/graph/:server_id/infractions", method = "get")]
    async fn get_server_graph_infractions(&self, data: Data<&AppData>) {
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
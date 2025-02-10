
use chrono::{DateTime, Duration, Utc};
use poem_openapi::{param::{Path, Query}, Enum, Object, OpenApi};

use poem::web::Data;
use sqlx::{Pool, Postgres};

use itertools::Itertools;
use crate::{model::{
	DbPlayerSession, DbServer, DbServerCountData, DbServerMapPlayed, ErrorCode, Response
}, utils::pg_interval_to_f64};
use crate::{response, AppData};
use crate::utils::{retain_peaks, ChronoToTime};

#[derive(Object)]
pub struct ServerCountData{
    pub bucket_time: DateTime<Utc>,
    pub player_count: i32
}

#[derive(Object)]
pub struct ServerMapPlayed{
    pub time_id: i32,
    pub server_id: String,
    pub map: String,
    pub player_count: i32,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
}
#[derive(Object)]
pub struct PlayerSession{
	pub id: String,
    pub player_id: String,
	pub started_at: DateTime<Utc>,
	pub ended_at: Option<DateTime<Utc>>,
	pub duration: Option<f64>,
}
#[derive(Object)]
pub struct ServerPlayerSession{
	pub player_id: String,
	pub player_name: String,
	pub played_time: f64,
	pub sessions: Vec<PlayerSession>
}

#[derive(Object)]
pub struct ServerPlayerSessions{
	pub total_player_counts: i64,
	pub players: Vec<ServerPlayerSession>
}
#[derive(Enum)]
pub enum EventType{
	Join,
	Leave
}

impl ToString for EventType{
	fn to_string(&self) -> String {
		let result = match self{
			EventType::Join => "join",
			EventType::Leave => "leave"
		};
		String::from(result)
	}
}

pub struct GraphApi;

#[OpenApi]
impl GraphApi {
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
			return response!(err "Server not found", ErrorCode::NotFound);
		};

		let Ok(result) = sqlx::query_as!(DbServerCountData, 
			"WITH vars AS (
				SELECT
					date_trunc('minute', (
						SELECT MAX(bucket_time) FROM server_player_counts
					)) AS start_time_uncalculated,
					date_trunc('minute', now()) AS end_time_uncalculated
			),
			adjusted_vars AS (
				SELECT
					GREATEST($2, start_time_uncalculated) AS final_start_time,
					LEAST($3, end_time_uncalculated) AS final_end_time
				FROM vars
			),
			time_buckets AS (
				SELECT generate_series(
					(SELECT final_start_time FROM adjusted_vars),
					(SELECT final_end_time FROM adjusted_vars),
					'1 minute'::interval
				) AS bucket_time
			),
			filtered_sessions AS (
				SELECT *
				FROM player_server_session pss
				WHERE pss.started_at <= (SELECT final_end_time FROM adjusted_vars)
        		AND (pss.ended_at >= (SELECT final_start_time FROM adjusted_vars) OR (
					pss.ended_at IS NULL AND (now() - pss.started_at) < INTERVAL '12 hours'
				))
			),
			historical_counts AS (
				SELECT
					tb.bucket_time,
					ps.server_id,
					COALESCE(COUNT(DISTINCT ps.player_id), 0) AS player_count
				FROM time_buckets tb
				LEFT JOIN filtered_sessions ps
					ON tb.bucket_time >= ps.started_at
					AND tb.bucket_time <= COALESCE(ps.ended_at - INTERVAL '3 minutes', tb.bucket_time)
					AND ps.server_id = $1
				GROUP BY tb.bucket_time, ps.server_id
			)
			SELECT
				COALESCE(server_id, $1) as server_id,
				bucket_time,
				LEAST(player_count, 64) as player_count
			FROM historical_counts
			UNION ALL
			SELECT * FROM server_player_counts
			WHERE
				server_id=$1
				AND bucket_time >= $2
				AND bucket_time <= $3
			ORDER BY bucket_time DESC
			",
			server.server_id, start.0.to_db_time(), end.0.to_db_time()
		)
		.fetch_all(pool)
		.await else {
			return response!(internal_server_error);
		};
		let mut result = retain_peaks(result, 1_500,
			|left, maxed| left.player_count > maxed.player_count, 
			|left, min| left.player_count < min.player_count, 
		);
		result.sort_by(|a, b| b.bucket_time.partial_cmp(&a.bucket_time).unwrap_or(std::cmp::Ordering::Equal));
	 	let response =	result
			.into_iter()
			.map(|e| e.into())
			.collect();
		response!(ok response)
    }
    #[oai(path = "/graph/:server_id/maps", method = "get")]
    async fn get_server_graph_map(
		&self, data: Data<&AppData>, server_id: Path<String>, start: Query<DateTime<Utc>>, end: Query<DateTime<Utc>>
	) -> Response<Vec<ServerMapPlayed>> {
		let pool = &data.0.pool;
		let start = start.0;
		let end = end.0;
		if end.signed_duration_since(start) > Duration::days(2) {
			return response!(err "You can only get maps within 2 days", ErrorCode::BadRequest);
		};

		let Some(server) = self.get_server(pool, &server_id.0).await else {
			return response!(err "Server not found", ErrorCode::NotFound);
		};
		let Ok(rows) = sqlx::query_as!(DbServerMapPlayed, 
			"SELECT * FROM server_map_played WHERE server_id=$1 AND started_at >= $2 AND started_at <= $3 ", 
				server.server_id, start.to_db_time(), end.to_db_time())
			.fetch_all(pool)
			.await else {
				return response!(internal_server_error)
			};
		let response = rows
			.into_iter()
			.map(|e| e.into())
			.collect();

		response!(ok response)
    }
	#[oai(path="/graph/:server_id/event_count", method="get")]
	async fn get_server_event_count(
		&self, data: Data<&AppData>, 
		server_id: Path<String>, 
		event_type: Query<EventType>, start: Query<DateTime<Utc>>, 
		end: Query<DateTime<Utc>>
	) -> Response<Vec<ServerCountData>>{
		let pool = &data.pool;
		let Some(server) = self.get_server(pool, &server_id.0).await else {
			return response!(err "Server not found", ErrorCode::NotFound);
		};
		let Ok(result) = sqlx::query_as!(DbServerCountData, "
			SELECT 
				server_id,
				date_trunc('minute', created_at) AS bucket_time,
				COUNT(*) AS player_count
			FROM player_server_activity
			WHERE event_name=$1 
				AND server_id=$2 
				AND created_at >= $3
				AND created_at <= $4
			GROUP BY server_id, bucket_time
			ORDER BY bucket_time ASC
		", event_type.to_string(), server.server_id, start.0.to_db_time(), end.0.to_db_time())
		.fetch_all(pool).await else {
			return response!(internal_server_error)
		};

		let mut result = retain_peaks(result, 1_500,
			|left, maxed| left.player_count > maxed.player_count, 
			|left, min| left.player_count < min.player_count, 
		);
		result.sort_by(|a, b| b.bucket_time.partial_cmp(&a.bucket_time).unwrap_or(std::cmp::Ordering::Equal));
		let response = result
			.into_iter()
			.map(|e| e.into())
			.collect();

		response!(ok response)
	}
	#[oai(path = "/graph/:server_id/players", method = "get")]
	async fn get_server_players(
		&self, data: Data<&AppData>, server_id: Path<String>, 
		start: Query<DateTime<Utc>>, end: Query<DateTime<Utc>>, page: Query<usize>
	) -> Response<ServerPlayerSessions>{
		let pool = &data.pool;
		let Some(server) = self.get_server(pool, &server_id.0).await else {
			return response!(err "Server not found", ErrorCode::NotFound);
		};
		let pagination_size = 70;
		let offset = pagination_size * page.0 as i64;
		let Ok(rows) = sqlx::query_as!(DbPlayerSession,
			"WITH sessions_selection AS (
					SELECT *, 
						CASE
							WHEN ended_at IS NOT NULL 
							THEN ended_at - started_at
							WHEN ended_at IS NULL AND (now() - started_at) < INTERVAL '12 hours'
							THEN now() - started_at
							ELSE INTERVAL '0'
						END as duration
					FROM public.player_server_session
					WHERE server_id = $3 
						AND((ended_at IS NOT NULL AND ended_at >= $1)
						OR (
							ended_at IS NULL
						))
						AND started_at <= $2
				),
				session_duration AS (
					SELECT * FROM (
						SELECT player_id, SUM(duration) AS played_time,
							COUNT(player_id) OVER() AS total_players
						FROM sessions_selection sessions
						GROUP BY player_id
					) s
					ORDER BY played_time DESC
					LIMIT $4
					OFFSET $5
				)
				SELECT 
					full_sessions.session_id, 
					full_sessions.player_id,
					p.player_name,
					full_sessions.started_at,
					full_sessions.ended_at,
					full_sessions.duration,
					durr.played_time,
					durr.total_players
				FROM session_duration durr
				INNER JOIN sessions_selection full_sessions
				ON durr.player_id=full_sessions.player_id
				LEFT JOIN player p
				ON p.player_id=full_sessions.player_id
				ORDER BY durr.played_time DESC
			", start.0.to_db_time(), end.0.to_db_time(), server.server_id, pagination_size, offset
		).fetch_all(pool).await else {
			return response!(internal_server_error);
		};
		let mapped = rows
			.iter()
			.into_group_map_by(|e| e.player_id.clone());

		let total_player_count = rows
			.first()
			.and_then(|e| e.total_players)
			.unwrap_or_default();
		let mut result = vec![];
		for (_, value) in mapped{
			let Some(first) = value.first() else {
				continue;
			};
			let Some(player_id) = first.player_id.clone() else {
				continue;
			};
			let sessions: Vec<PlayerSession> = value
				.iter()
				.map(|e|  (**e).clone().into())
				.collect();
			let player = ServerPlayerSession {
				player_id,
				player_name: first.player_name.clone().unwrap_or_default(),
				played_time: first.played_time.clone().map(pg_interval_to_f64).unwrap_or(0.),
				sessions
			};
			result.push(player);
		}
		result.sort_by(|a, b| b.played_time.partial_cmp(&a.played_time).unwrap_or(std::cmp::Ordering::Equal));
		let value = ServerPlayerSessions {
			total_player_counts: total_player_count,
			players: result
		};
		response!(ok value)
	}
    #[oai(path = "/graph/:server_id/infractions", method = "get")]
    async fn get_server_graph_infractions(&self, data: Data<&AppData>) {
        // TODO: MAX OF 2 weeks
        todo!()
    }
}

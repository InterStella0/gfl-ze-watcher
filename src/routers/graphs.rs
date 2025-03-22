use std::fmt::Display;
use chrono::{DateTime, Duration, Utc};
use poem_openapi::{param::{Path, Query}, Enum, OpenApi};

use poem::web::Data;
use sqlx::{Pool, Postgres};

use crate::model::DbPlayerBrief;
use crate::routers::api_models::{BriefPlayers, ErrorCode, EventType, Response, ServerCountData, ServerMapPlayed};
use crate::utils::{cached_response, retain_peaks, update_online_brief, ChronoToTime};
use crate::{model::{
	DbServer, DbServerCountData, DbServerMapPlayed
}, utils::IterConvert};
use crate::{response, AppData};

#[derive(Enum)]
#[oai(rename_all = "lowercase")]
enum TopPlayersTimeFrame{
	Today,
	Week1,
	Week2,
	Month1,
	Month6,
	Year1,
	All
}


impl Display for TopPlayersTimeFrame {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			TopPlayersTimeFrame::Today => write!(f, "today"),
			TopPlayersTimeFrame::Week1 => write!(f, "week1"),
			TopPlayersTimeFrame::Week2 => write!(f, "week2"),
			TopPlayersTimeFrame::Month1 => write!(f, "month1"),
			TopPlayersTimeFrame::Month6 => write!(f, "month6"),
			TopPlayersTimeFrame::Year1 => write!(f, "year1"),
			TopPlayersTimeFrame::All => write!(f, "all"),
		}
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
					GREATEST(date_trunc('minute', $2::timestamptz), start_time_uncalculated) AS final_start_time,
					LEAST(date_trunc('minute', $3::timestamptz), end_time_uncalculated) AS final_end_time
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
		response!(ok result.iter_into())
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
			"SELECT *, NULL::integer total_sessions
				FROM server_map_played
         		WHERE server_id=$1 AND started_at >= $2 AND started_at <= $3 ",
				server.server_id, start.to_db_time(), end.to_db_time())
			.fetch_all(pool)
			.await else {
				return response!(internal_server_error)
			};
		response!(ok rows.iter_into())
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
		response!(ok result.iter_into())
	}
	#[oai(path = "/graph/:server_id/top_players", method = "get")]
	async fn get_server_top_players(
		&self, data: Data<&AppData>, server_id: Path<String>, time_frame: Query<TopPlayersTimeFrame>
	) -> Response<BriefPlayers>{
		let pool = &data.pool;
		let Some(server) = self.get_server(pool, &server_id.0).await else {
			return response!(err "Server not found", ErrorCode::NotFound);
		};
		let sql_func = || sqlx::query_as!(DbPlayerBrief,
			"WITH pre_vars AS (
				SELECT
					$2 AS timeframe,
					$1 AS server_id
			),
			vars AS (
				SELECT
					now() AS right_now,
					CASE
						WHEN pv.timeframe = 'today' THEN now() - INTERVAL '1 day'
						WHEN pv.timeframe = 'week1' THEN now() - INTERVAL '1 week'
						WHEN pv.timeframe = 'week2' THEN now() - INTERVAL '2 week'
						WHEN pv.timeframe = 'month1' THEN now() - INTERVAL '1 month'
						WHEN pv.timeframe = 'month6' THEN now() - INTERVAL '6 month'
						WHEN pv.timeframe = 'year1' THEN now() - INTERVAL '1 year'
						ELSE (
							SELECT MIN(started_at)
							FROM player_server_session
							WHERE server_id = pv.server_id
						)
					END AS min_start
				FROM pre_vars pv
			),
			sessions_selection AS (
				SELECT *,
					CASE
						WHEN ended_at IS NOT NULL THEN ended_at - started_at
						WHEN ended_at IS NULL AND now() - started_at < INTERVAL '12 hours'
							THEN now() - started_at
						ELSE INTERVAL '0'
					END AS duration
				FROM player_server_session
				WHERE server_id = (SELECT server_id FROM pre_vars)
				  AND (
						(ended_at IS NOT NULL AND ended_at >= (SELECT min_start FROM vars))
						OR (ended_at IS NULL)
					  )
				  AND started_at <= (SELECT right_now FROM vars)
			),
			session_duration AS (
				SELECT
					player_id,
					SUM(duration) AS played_time,
					COUNT(*) OVER () AS total_players
				FROM sessions_selection
				GROUP BY player_id
			),
			top_players AS (
				SELECT *
				FROM session_duration
				ORDER BY played_time DESC
				LIMIT 20
			)
			SELECT
				p.player_id,
				p.player_name,
				p.created_at,
				sp.played_time AS total_playtime,
				ROW_NUMBER() OVER (ORDER BY sp.played_time DESC)::int AS rank,
				COALESCE(op.started_at, NULL) AS online_since,
				lp.ended_at AS last_played,
				(lp.ended_at - lp.started_at) AS last_played_duration,
				sp.total_players
			FROM top_players sp
			JOIN player p
				ON p.player_id = sp.player_id
			LEFT JOIN LATERAL (
				SELECT s.started_at, s.ended_at
				FROM player_server_session s
				WHERE s.player_id = p.player_id
				  AND s.ended_at IS NOT NULL
				ORDER BY s.ended_at DESC
				LIMIT 1
			) lp ON TRUE
			LEFT JOIN LATERAL (
				SELECT s.started_at
				FROM player_server_session s
				WHERE s.player_id = p.player_id
				  AND s.ended_at IS NULL
				  AND now() - s.started_at < INTERVAL '12 hours'
				ORDER BY s.started_at ASC
				LIMIT 1
			) op ON TRUE
			ORDER BY sp.played_time DESC;
			", server.server_id, time_frame.0.to_string()
		).fetch_all(pool);
		let key = format!("server-player:{}:{}", server.server_id, time_frame.0);
		let ttl = match time_frame.0{
			TopPlayersTimeFrame::Today => 30 * 60,
			TopPlayersTimeFrame::Week1 => 6 * 60 * 60,
			TopPlayersTimeFrame::Week2 => 12 * 60 * 60,
			TopPlayersTimeFrame::Month1 => 24 * 60 * 60,
			TopPlayersTimeFrame::Month6
			| TopPlayersTimeFrame::Year1
			| TopPlayersTimeFrame::All => 48 * 60 * 60,
		};

		let Ok(result) = cached_response(&key, &data.redis_pool, ttl, sql_func).await else {
			return response!(internal_server_error)
		};

		let rows = result.result;
		let total_player_count = rows
			.first()
			.and_then(|e| e.total_players)
			.unwrap_or_default();

		let mut briefs = rows.iter_into();
		if !result.is_new{
			update_online_brief(&data.pool, &server.server_id, &mut briefs).await
		}

		let value = BriefPlayers {
			total_players: total_player_count,
			players: briefs
		};
		response!(ok value)
	}
	#[oai(path = "/graph/:server_id/players", method = "get")]
	async fn get_server_players(
		&self, data: Data<&AppData>, server_id: Path<String>, 
		start: Query<Option<DateTime<Utc>>>, end: Query<DateTime<Utc>>, page: Query<usize>
	) -> Response<BriefPlayers>{
		let pool = &data.pool;
		let Some(server) = self.get_server(pool, &server_id.0).await else {
			return response!(err "Server not found", ErrorCode::NotFound);
		};
		let pagination_size = 70;
		let offset = pagination_size * page.0 as i64;
		let sql_func = || sqlx::query_as!(DbPlayerBrief,
			"WITH vars AS (
                SELECT
                	COALESCE($1, (
                		SELECT MIN(started_at) FROM player_server_session WHERE server_id=$3)
                	) AS min_start
            ),
            sessions_selection AS (
                SELECT *,
                    CASE
                        WHEN ended_at IS NOT NULL
                        THEN ended_at - started_at
                        WHEN ended_at IS NULL AND (now() - started_at) < INTERVAL '12 hours'
                        THEN now() - started_at
                        ELSE INTERVAL '0'
                    END as duration
                FROM player_server_session
                WHERE server_id = $3
                    AND((ended_at IS NOT NULL AND ended_at >= (
                        SELECT min_start FROM vars
                    ))
                    OR (
                        ended_at IS NULL
                    ))
                    AND started_at <= $2
            ),
			session_duration AS (
                SELECT * FROM (
                    SELECT player_id,
                        SUM(duration) AS played_time,
                        COUNT(player_id) OVER() AS total_players,
                        RANK() OVER(ORDER BY SUM(duration) DESC) AS rank
                    FROM sessions_selection sessions
                    GROUP BY player_id
                ) s
                ORDER BY played_time DESC
                LIMIT $4
                OFFSET $5
			),
            online_players AS (
                SELECT player_id, started_at
                FROM player_server_session
                WHERE server_id=$3
                	AND ended_at IS NULL
                	AND now() - started_at < INTERVAL '12 hours'
            ),
			last_played_players AS (
				SELECT s.*
				FROM player_server_session s
				JOIN (
					SELECT player_id, MAX(ended_at) AS ended_at
					FROM player_server_session
					WHERE ended_at IS NOT NULL
					GROUP BY player_id
				) latest ON s.player_id = latest.player_id AND s.ended_at = latest.ended_at
			)
            SELECT
                p.player_id,
                p.player_name,
                p.created_at,
                durr.played_time as total_playtime,
                durr.rank::int,
                COALESCE(op.started_at, NULL) as online_since,
                lp.ended_at as last_played,
                (lp.ended_at - lp.started_at) as last_played_duration,
                durr.total_players
            FROM player p
            JOIN session_duration durr
            	ON p.player_id=durr.player_id
            JOIN last_played_players lp
                ON lp.player_id=durr.player_id
            LEFT JOIN online_players op
            	ON op.player_id=durr.player_id
            ORDER BY durr.played_time DESC
			", start.0.map(|e| e.to_db_time()),
			end.0.to_db_time(), server.server_id, pagination_size, offset
		).fetch_all(pool);
		let key = format!("server-player:{}:{}:{}:{}",
			server.server_id, start.0.map(|s| s.to_string()).unwrap_or_default(),
			end.0.to_string(), page.0
		);
		let Ok(result) = cached_response(&key, &data.redis_pool, 5 * 60, sql_func).await else {
			return response!(internal_server_error);
		};

		let rows = result.result;
		let total_player_count = rows
			.first()
			.and_then(|e| e.total_players)
			.unwrap_or_default();
		let value = BriefPlayers {
			total_players: total_player_count,
			players: rows.iter_into()
		};
		response!(ok value)
	}
}

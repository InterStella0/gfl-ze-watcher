use deadpool_redis::redis::{AsyncCommands};
use poem::web::Data;
use poem_openapi::{param::{Path, Query}, OpenApi};
use redis::RedisResult;
use crate::model::{DbPlayer, DbPlayerAlias, DbPlayerBrief};
use crate::routers::api_models::{
    BriefPlayers, DetailedPlayer, PlayerInfraction, PlayerMostPlayedMap, PlayerProfilePicture,
    PlayerRegionTime, PlayerSessionTime, ProviderResponse, SearchPlayer, ErrorCode, Response
};
use crate::{model::{DbPlayerDetail, DbPlayerInfraction, DbPlayerMapPlayed, DbPlayerRegionTime,
                    DbPlayerSessionTime}, response, utils::IterConvert, AppData};

pub struct PlayerApi;
const REDIS_CACHE_TTL: u64 = 5 * 24 * 60 * 60;


#[OpenApi]
impl PlayerApi{
    #[oai(path = "/players/autocomplete", method = "get")]
    async fn get_players_autocomplete(
        &self, data: Data<&AppData>, player_name: Query<String>
    ) -> Response<Vec<SearchPlayer>>{
        let Ok(result) = sqlx::query_as!(DbPlayer, "
            SELECT player_id, player_name, created_at FROM (
                SELECT *, STRPOS(player_name, $2) AS ranked
                FROM player
                WHERE LOWER(player_name) LIKE $1
                ORDER BY ranked ASC
                LIMIT 20
            ) a
        ", format!("%{}%", player_name.0.to_lowercase()), player_name.0
        ).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/players/search", method = "get")]
    async fn get_players_search(
        &self, data: Data<&AppData>, player_name: Query<String>, page: Query<usize>
    ) -> Response<BriefPlayers>{
        let pagination = 40;
        let paging = page.0 as i64 * pagination;
        let Ok(result) = sqlx::query_as!(DbPlayerBrief, "
            WITH VARS as (
                SELECT 
                    LOWER($1::text) AS target
            ), searched_users AS (
                SELECT
                    p.player_id,
                    p.player_name,
                    p.created_at,
                    COUNT(ps.session_id) AS session_count,
                    STRPOS(p.player_name, (SELECT target FROM VARS)) AS ranked,
                    COUNT(p.player_id) OVER() AS total_players
                FROM public.player p
                LEFT JOIN player_server_session ps 
                    ON p.player_id = ps.player_id
                WHERE LOWER(p.player_name) LIKE CONCAT('%', (SELECT target FROM VARS), '%')
                GROUP BY p.player_id
                ORDER BY ranked ASC
                LIMIT $3 OFFSET $2
            ), all_time_play AS (
                SELECT player_id, playtime AS total_playtime, rank FROM (
                    SELECT
                        s.player_id,
                        s.playtime,
                        RANK() OVER(ORDER BY s.playtime DESC)
                    FROM (
                        SELECT
                            player_id,
                            SUM(
                                CASE
                                    WHEN ended_at IS NULL AND now() - started_at > INTERVAL '12 hours'
                                    THEN INTERVAL '0 second'
                                    ELSE COALESCE(ended_at, now()) - started_at
                                END
                            ) AS playtime
                        FROM player_server_session
                        GROUP BY player_id
                    ) s
                ) t
            ), online_players AS (
                SELECT
                    player_id,
                    started_at as online_since
                FROM player_server_session
                WHERE ended_at IS NULL
                    AND now() - started_at < INTERVAL '12 hours'
                ORDER BY started_at DESC
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
                su.total_players::bigint,
                su.player_id,
                su.player_name,
                su.created_at,
                cd.total_playtime,
                cd.rank::int,
                 -- require to do COALESCE NULL because sqlx interpret it wrongly
                COALESCE(op.online_since, null) online_since,
                lp.ended_at as last_played,
                (lp.ended_at - lp.started_at) as last_played_duration
            FROM searched_users su
            JOIN last_played_players lp
                ON lp.player_id=su.player_id
            LEFT JOIN all_time_play cd
                ON cd.player_id=su.player_id
            LEFT JOIN online_players op
                ON op.player_id=su.player_id
            ORDER BY su.ranked DESC, cd.total_playtime DESC;
        ", format!("%{}%", player_name.0), paging, pagination)
            .fetch_all(&data.0.pool)
            .await else {
                return response!(internal_server_error)
        };
        let total_player_count = result
            .first()
            .and_then(|e| e.total_players)
            .unwrap_or_default();
        response!(ok BriefPlayers {
            total_players: total_player_count,
            players: result.iter_into()
        })
    }

    #[oai(path = "/players/:player_id/graph/sessions", method = "get")]
    async fn get_player_sessions(
        &self, data: Data<&AppData>, player_id: Path<i64>
    ) -> Response<Vec<PlayerSessionTime>>{
        let pool = &data.pool;
        // TODO: Extract map per bucket_time, how long they spent in maps
        let Ok(result) = sqlx::query_as!(DbPlayerSessionTime, "
            SELECT 
                DATE_TRUNC('day', started_at) AS bucket_time,
                ROUND((
                    SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) / 3600
                )::numeric, 2)::double precision AS hour_duration
            FROM public.player_server_session
            WHERE player_id = $1
            GROUP BY bucket_time
            ORDER BY bucket_time;
        ", player_id.0.to_string()).fetch_all(pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/players/:player_id/infractions", method = "get")]
    async fn get_player_infractions(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<Vec<PlayerInfraction>> {
        let pool = &data.pool;
        let Ok(result) = sqlx::query_as!(DbPlayerInfraction, "
            SELECT 
                infraction_id,
                payload->>'reason' reason, 
                payload->'admin'->>'admin_name' as by,
				payload->'admin'->>'avatar_id' as admin_avatar,
				(payload->>'flags')::int flags,
                to_timestamp((payload->>'created')::double precision::bigint) infraction_time
            FROM public.server_infractions
            WHERE payload->'player' ? 'gs_id' 
                AND payload->'player'->>'gs_id' = $1
            ORDER BY infraction_time DESC
        ", player_id.0.to_string()).fetch_all(pool).await else {
			return response!(internal_server_error)
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/players/:player_id/detail", method = "get")]
    async fn get_player_detail(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<DetailedPlayer>{
        let pool = &data.0.pool;
        let player_id = player_id.0.to_string();
        let detail = match sqlx::query_as!(DbPlayerDetail, "
            WITH user_played  AS (
                SELECT 
                    mp.server_id,
                    mp.map,
                    SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
                FROM player_server_session pss
                JOIN server_map_played sm 
                	ON sm.server_id = pss.server_id
                JOIN server_map mp
                    ON sm.map=mp.map AND sm.server_id=mp.server_id
                WHERE pss.player_id=$1
                	AND pss.started_at < sm.ended_at
                	AND pss.ended_at > sm.started_at
                GROUP BY mp.server_id, mp.map
                ORDER BY played DESC
            ), categorized AS (
                SELECT
                    mp.server_id, 
                COALESCE(is_casual, false) casual, COALESCE(is_tryhard, false) tryhard, SUM(played) total
                FROM user_played up
                LEFT JOIN server_map mp
                    ON mp.map=up.map AND mp.server_id=up.server_id
                GROUP BY mp.server_id, is_casual, is_tryhard
                ORDER BY total DESC
            ), hard_or_casual AS (
                SELECT 
                    server_id,
                CASE WHEN tryhard THEN false ELSE casual END AS is_casual,
                CASE WHEN tryhard THEN true ELSE false END AS is_tryhard,
                SUM(total) summed
                FROM categorized
                GROUP BY server_id, is_casual, is_tryhard
                ORDER BY summed DESC
            ),
            ranked_data AS (
                SELECT *,
                    SUM(summed) OVER() AS full_play
                FROM hard_or_casual
            ), categorized_data AS (
                SELECT 
                    SUM(CASE WHEN is_tryhard THEN summed ELSE INTERVAL '0 seconds' END) AS tryhard_playtime,
                    SUM(CASE WHEN is_casual THEN summed ELSE INTERVAL '0 seconds' END) AS casual_playtime
                FROM ranked_data
            ), all_time_play AS (
				SELECT playtime, rank FROM (
					SELECT
					    s.player_id,
					    s.playtime,
					    RANK() OVER(ORDER BY s.playtime DESC)
					FROM (
						SELECT
						    player_id,
						    SUM(
						        CASE
						            WHEN ended_at IS NULL AND now() - started_at > INTERVAL '12 hours'
						            THEN INTERVAL '0 second'
						            ELSE COALESCE(ended_at, now()) - started_at
						        END
						    ) AS playtime
						FROM player_server_session
						GROUP BY player_id
					) s
				) t WHERE t.player_id=$1
			), last_played_detail AS (
			    SELECT started_at, ended_at
			    FROM player_server_session
			    WHERE player_id=$1
			      AND ended_at IS NOT NULL
			    ORDER BY ended_at DESC
			    LIMIT 1
			)
            SELECT
                su.player_id,
                su.player_name,
                su.created_at,
                cd.tryhard_playtime,
                cd.casual_playtime,
				tp.playtime AS total_playtime,
                CASE 
                    WHEN tp.playtime < INTERVAL '10 hours' THEN null
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 0) <= 0.3 THEN 'casual'
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 0) >= 0.7 THEN 'tryhard'
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 0) BETWEEN 0.4 AND 0.6 THEN 'mixed'
                    ELSE null
                END AS category,
	            (
                    SELECT map
                    FROM user_played
                    WHERE player_id=su.player_id
                    ORDER BY played
                    DESC LIMIT 1
                ) as favourite_map,
				tp.rank::int,
                (
					SELECT started_at
					FROM player_server_session s
					WHERE ended_at IS NULL
						AND s.player_id=su.player_id
						AND now() - started_at < INTERVAL '12 hours'
                    LIMIT 1
				) online_since,
                lp.ended_at AS last_played,
                lp.ended_at - lp.started_at AS last_played_duration
			FROM player su
            JOIN categorized_data cd ON true
			JOIN all_time_play tp ON true
            JOIN last_played_detail lp ON true
			WHERE su.player_id=$1
            LIMIT 1
        ", player_id)
        .fetch_one(pool)
        .await {
            Ok(detail) => detail,
            Err(e) => {
                return response!(internal_server_error)
            }
        };

        let mut details = detail.into();
        let Ok(aliases) = sqlx::query_as!(DbPlayerAlias, "
            SELECT event_value as name, created_at FROM player_activity
            WHERE event_name='name' AND player_id=$1
            ORDER BY created_at
        ", player_id).fetch_all(pool).await else {
            return response!(ok details)
        };
        let mut aliases_filtered = vec![];
        let mut last_seen = String::from("");
        for alias in aliases{ // due to buggy impl lol
            if alias.name != last_seen{
                last_seen = alias.name.to_string();
                aliases_filtered.push(alias);
            }
        }
        aliases_filtered.reverse();
        details.aliases = aliases_filtered.iter_into();
        response!(ok details)
    }
    #[oai(path = "/players/:player_id/pfp", method = "get")]
    async fn get_player_pfp(
        &self, data: Data<&AppData>, player_id: Path<i64>
    ) -> Response<PlayerProfilePicture>{
        let Some(provider) = &data.0.steam_provider else {
            return response!(err "This feature is disabled.", ErrorCode::NotImplemented)
        };
        async fn fetch_profile(provider: &str, player_id: &i64) -> Result<ProviderResponse, ErrorCode> {
            let url = format!("{provider}/steams/pfp/{player_id}");
            let resp = reqwest::get(&url).await.map_err(|_| ErrorCode::NotImplemented)?;
            let result = resp.json::<ProviderResponse>().await.map_err(|_| ErrorCode::NotFound)?;
            Ok(result)
        }

        let redis_key = format!("gfl-ze-watcher:pfp_cache:{}", player_id.0);
        let profile = if let Ok(mut conn) = data.redis_pool.get().await {
            match conn.get(&redis_key).await.ok() {
                Some(value) => value,
                None => {
                    let Ok(profile) = fetch_profile(provider, &player_id.0).await else {
                        tracing::warn!("Couldn't fetch profile from provider!");
                        return response!(err "No player id found", ErrorCode::NotFound)
                    };
                    let save: RedisResult<()> = conn.set_ex(&redis_key, &profile, REDIS_CACHE_TTL).await;
                    if let Err(e) = save{
                        tracing::warn!("Couldn't save to redis! {}", e);
                    }
                    profile
                }
            }
        } else {
            let Ok(profile) = fetch_profile(provider, &player_id.0).await else {
                tracing::warn!("Couldn't fetch profile from provider!");
                return response!(err "No player id found", ErrorCode::NotFound)
            };
            profile
        };
        response!(ok PlayerProfilePicture{
            id: player_id.0.to_string(),
            url: profile.url
        })
    }
    #[oai(path="/players/:player_id/most_played_maps", method="get")]
    async fn get_player_most_played(
        &self, data: Data<&AppData>, player_id: Path<i64>
    ) -> Response<Vec<PlayerMostPlayedMap>>{
        let Ok(result) = sqlx::query_as!(DbPlayerMapPlayed, "
            SELECT 
                mp.server_id,
                mp.map,
                SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
            FROM player_server_session pss
            JOIN server_map_played sm 
            	ON sm.server_id = pss.server_id
            JOIN server_map mp
                ON sm.map=mp.map AND sm.server_id=mp.server_id
            WHERE pss.player_id=$1
            	AND pss.started_at < sm.ended_at
            	AND pss.ended_at   > sm.started_at
            GROUP BY mp.server_id, mp.map
            ORDER BY played DESC
            LIMIT 10
        ", player_id.0.to_string()).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path="/players/:player_id/regions", method="get")]
    async fn get_player_region(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<Vec<PlayerRegionTime>>{
        let Ok(result) = sqlx::query_as!(DbPlayerRegionTime, "
            WITH session_days AS (
                SELECT
                    s.session_id,
                    generate_series(
                    date_trunc('day', s.started_at),
                    date_trunc('day', s.ended_at),
                    interval '1 day'
                    ) AS session_day,
                    s.started_at,
                    s.ended_at
                FROM player_server_session s
                WHERE player_id = $1
            ),
            region_intervals AS (
                SELECT
                    sd.session_id,
                    rt.region_id,
                    ((sd.session_day::date || ' ' || rt.start_time::text)::timestamptz) AS region_start,
                    CASE
                    WHEN rt.start_time < rt.end_time THEN
                        ((sd.session_day::date || ' ' || rt.end_time::text)::timestamptz)
                    ELSE
                        (((sd.session_day::date + 1) || ' ' || rt.end_time::text)::timestamptz)
                    END AS region_end,
                    sd.started_at,
                    sd.ended_at
                FROM session_days sd
                CROSS JOIN region_time rt
            ),
            session_region_overlap AS (
                SELECT
                    session_id,
                    region_id,
                    GREATEST(region_start, started_at) AS overlap_start,
                    LEAST(region_end, ended_at) AS overlap_end
                FROM region_intervals
                WHERE LEAST(region_end, ended_at) > GREATEST(region_start, started_at)
            ), finished AS (
                SELECT 
                region_id,
                sum(overlap_end - overlap_start) AS played_time
                FROM session_region_overlap
                GROUP BY region_id
            )
            SELECT *, 
                (SELECT region_name FROM region_time WHERE region_id=o.region_id LIMIT 1) AS region_name
            FROM finished o
            ORDER BY o.played_time

        ", player_id.0.to_string())
            .fetch_all(&data.0.pool)
            .await else {
                return response!(internal_server_error)
            };

        response!(ok result.iter_into())
    }

}
use chrono::{DateTime, Utc};
use poem::web::Data;
use poem_openapi::{param::{Path, Query}, OpenApi};
use serde::{Deserialize, Deserializer};
use futures::future::join_all;
use poem::http::StatusCode;
use sqlx::{Pool, Postgres};
use tokio::task;
use crate::model::{DbPlayer, DbPlayerAlias, DbPlayerBrief, DbPlayerSession, DbServer};
use crate::routers::api_models::{
    BriefPlayers, DetailedPlayer, PlayerInfraction,
    PlayerMostPlayedMap, PlayerProfilePicture, PlayerRegionTime,
    PlayerSessionTime, SearchPlayer, ErrorCode, Response,
    PlayerInfractionUpdate, ServerExtractor, UriPatternExt, RoutePattern
};
use crate::{model::{DbPlayerDetail, DbPlayerInfraction, DbPlayerMapPlayed, DbPlayerRegionTime,
                    DbPlayerSessionTime}, response, utils::IterConvert, AppData};
use crate::utils::{cached_response, get_profile, get_server, update_online_brief, DAY};

pub struct PlayerApi;


#[derive(Deserialize)]
#[allow(dead_code)]
pub struct PlayerInfractionUpdateData {
    pub id: String,
    pub admin: i64,
    pub reason: Option<String>,
    #[serde(rename = "created", deserialize_with = "timestamp_to_datetime")]
    pub infraction_time: Option<DateTime<Utc>>,
    pub flags: i64
}
pub struct InfractionCombined{
    pub new_infraction: Option<PlayerInfractionUpdateData>,
    pub old_infraction: PlayerInfraction
}
impl Into<PlayerInfraction> for InfractionCombined {
    fn into(self) -> PlayerInfraction {
        let Some(new_infraction) = self.new_infraction else {
            return self.old_infraction
        };
        PlayerInfraction{
            id: new_infraction.id,
            by: self.old_infraction.by,
            reason: new_infraction.reason,
            infraction_time: new_infraction.infraction_time,
            flags: new_infraction.flags,
            admin_avatar: self.old_infraction.admin_avatar,
        }
    }
}

fn timestamp_to_datetime<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
where
    D: Deserializer<'de>,
{
    let timestamp = Option::<i64>::deserialize(deserializer)?;
    Ok(timestamp.and_then(|ts| DateTime::from_timestamp(ts, 0)))
}

async fn fetch_infraction(id: &str) -> Result<PlayerInfractionUpdateData, reqwest::Error> {
    let url = format!("https://bans.gflclan.com/api/infractions/{}/info", id);
    let response = reqwest::get(url).await?.json().await?;
    Ok(response)
}

struct PlayerExtractor{
    server: DbServer,
    player: DbPlayer,
    cache_key: String,
}
async fn get_cache_key(pool: &Pool<Postgres>, redis_pool: &deadpool_redis::Pool, server_id: &str, player_id: &str) -> String{
    let func = || sqlx::query_as!(DbPlayerSession,
            "SELECT player_id, server_id, session_id, started_at, ended_at
             FROM player_server_session
             WHERE server_id=$1
             AND player_id=$2
             AND ended_at IS NOT NULL
             ORDER BY started_at DESC
             LIMIT 1
            ",
            server_id,
            player_id.to_string()
        ).fetch_one(pool);

    let key = format!("player-last-played:{server_id}:{player_id}");
    let Ok(result) = cached_response(&key, redis_pool, 60, func).await else {
        return "first-time".to_string();
    };

    result.result.session_id
}
async fn get_player(pool: &Pool<Postgres>, redis_pool: &deadpool_redis::Pool, player_id: &str) -> Option<DbPlayer>{
    let func = || sqlx::query_as!(DbPlayer,
            "SELECT player_id, player_name, created_at
             FROM player
             WHERE player_id=$1
             LIMIT 1
            ",
            player_id.to_string()
        ).fetch_one(pool);

    let key = format!("player-data:{player_id}");
    match cached_response(&key, redis_pool, 120 * DAY, func).await {
        Ok(r) => Some(r.result),
        Err(e) => {
            tracing::warn!("Failed to fetch player's data {}", e);
            None
        }
    }

}

impl PlayerExtractor {
    pub async fn new(app_data: &AppData, server: DbServer, player: DbPlayer) -> Self {
        let pool = &app_data.pool;
        let redis_pool = &app_data.redis_pool;
        let cache_key = get_cache_key(pool, redis_pool, &server.server_id, &player.player_id).await;
        Self{ server, player, cache_key }
    }

}

impl<'a> poem::FromRequest<'a> for PlayerExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let server_id = req.raw_path_param("server_id")
            .ok_or_else(|| poem::Error::from_string("Invalid server_id", StatusCode::BAD_REQUEST))?;

        let player_id = req.raw_path_param("player_id")
            .ok_or_else(|| poem::Error::from_string("Invalid player_id", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid data", StatusCode::BAD_REQUEST))?;

        let Some(player) = get_player(&data.pool, &data.redis_pool, &player_id).await else {
            return Err(poem::Error::from_string("Player not found", StatusCode::NOT_FOUND))
        };

        let Some(server) = get_server(&data.pool, &data.redis_pool, &server_id).await else {
            return Err(poem::Error::from_string("Server not found", StatusCode::NOT_FOUND))
        };

        Ok(PlayerExtractor::new(data, server, player).await)
    }
}


#[OpenApi]
impl PlayerApi{
    #[oai(path = "/servers/:server_id/players/autocomplete", method = "get")]
    async fn get_players_autocomplete(
        &self, data: Data<&AppData>, ServerExtractor(_server): ServerExtractor, player_name: Query<String>
    ) -> Response<Vec<SearchPlayer>>{
        let Ok(result) = sqlx::query_as!(DbPlayer, "
            SELECT player_id, player_name, created_at
            FROM (
                SELECT *,
                       CASE WHEN player_id = $2 THEN 0 ELSE 1 END AS id_rank,
                       STRPOS(LOWER(player_name), LOWER($2)) AS name_rank
                FROM player
                WHERE player_id = $2 OR LOWER(player_name) LIKE LOWER($1)
            ) a
            ORDER BY id_rank ASC, name_rank ASC NULLS LAST
            LIMIT 20;
        ", format!("%{}%", player_name.0.to_lowercase()), player_name.0
        ).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/servers/:server_id/players/search", method = "get")]
    async fn get_players_search(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_name: Query<String>, page: Query<usize>
    ) -> Response<BriefPlayers>{
        let pagination = 40;
        let paging = page.0 as i64 * pagination;
        let Ok(result) = sqlx::query_as!(DbPlayerBrief, "
            WITH VARS as (
                SELECT 
                    LOWER($1::text) AS target,
					$4 AS target_server
            ), searched_users AS (
                SELECT
                    p.player_id,
                    p.player_name,
                    p.created_at,
                    COUNT(ps.session_id) AS session_count,
                    CASE WHEN p.player_id = $1 THEN 0 ELSE 1 END AS id_rank,
                    STRPOS(p.player_name, (SELECT target FROM VARS)) AS name_rank,
                    COUNT(p.player_id) OVER() AS total_players
                FROM public.player p
                LEFT JOIN player_server_session ps
                    ON p.player_id = ps.player_id
                WHERE ps.server_id=(SELECT target_server FROM VARS) AND (
                    p.player_id=$1
                    OR LOWER(p.player_name) LIKE CONCAT('%', (SELECT target FROM VARS), '%'))
                GROUP BY p.player_id
                ORDER BY id_rank ASC, name_rank ASC NULLS LAST
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
                                    WHEN ended_at IS NULL AND CURRENT_TIMESTAMP - started_at > INTERVAL '12 hours'
                                    THEN INTERVAL '0 second'
                                    ELSE COALESCE(ended_at, CURRENT_TIMESTAMP) - started_at
                                END
                            ) AS playtime
                        FROM player_server_session
                        WHERE server_id=(SELECT target_server FROM VARS)
                        GROUP BY player_id
                    ) s
                ) t
            ), online_players AS (
                SELECT
                    player_id,
                    started_at as online_since
                FROM player_server_session
                WHERE ended_at IS NULL
                    AND CURRENT_TIMESTAMP - started_at < INTERVAL '12 hours'
                    AND server_id=(SELECT target_server FROM VARS)
                ORDER BY started_at DESC
            ),
			last_played_players AS (
				SELECT s.*
				FROM player_server_session s
				JOIN (
					SELECT player_id, MAX(ended_at) AS ended_at
					FROM player_server_session
					WHERE ended_at IS NOT NULL
						AND server_id=(SELECT target_server FROM VARS)
					GROUP BY player_id
				) latest ON s.player_id = latest.player_id AND s.ended_at = latest.ended_at
				WHERE server_id=(SELECT target_server FROM VARS)
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
            ORDER BY su.id_rank ASC, su.name_rank ASC NULLS LAST, cd.total_playtime DESC;
        ", player_name.0, paging, pagination, server.server_id)
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

    #[oai(path = "/servers/:server_id/players/:player_id/graph/sessions", method = "get")]
    async fn get_player_sessions(
        &self, data: Data<&AppData>, player: PlayerExtractor
    ) -> Response<Vec<PlayerSessionTime>>{
        let pool = &data.pool;
        let redis_pool = &data.redis_pool;
        // TODO: Extract map per bucket_time, how long they spent in maps
        let func = || sqlx::query_as!(DbPlayerSessionTime, "
            SELECT
                DATE_TRUNC('day', started_at) AS bucket_time,
                ROUND((
                    SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) / 3600
                )::numeric, 2)::double precision AS hour_duration
            FROM public.player_server_session
            WHERE player_id = $1 AND server_id=$2
            GROUP BY bucket_time
            ORDER BY bucket_time;
        ", player.player.player_id, player.server.server_id).fetch_all(pool);
        let key = format!("player-session:{}:{}:{}", player.server.server_id, player.player.player_id, player.cache_key);
        let Ok(result) = cached_response(&key, redis_pool, 60 * DAY, func).await else {
            return response!(ok vec![])
        };
        response!(ok result.result.iter_into())
    }
    #[oai(path = "/servers/:server_id/players/:player_id/infraction_update", method="get")]
    async fn get_force_player_infraction_update(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_id: Path<i64>
    ) -> Response<PlayerInfractionUpdate>{
        let pool = &data.pool;
        let Ok(result) = sqlx::query_as!(DbPlayerInfraction, "
            UPDATE public.server_infractions
            SET pending_update = TRUE
            WHERE payload->'player' ? 'gs_id'
                AND payload->>'server_id' = $2
                AND payload->'player'->>'gs_id' = $1
            RETURNING
                infraction_id,
                payload->>'reason' AS reason,
                payload->'admin'->>'admin_name' AS by,
                payload->'admin'->>'avatar_id' AS admin_avatar,
                (payload->>'flags')::bigint AS flags,
                to_timestamp((payload->>'created')::double precision::bigint) AS infraction_time
        ", player_id.0.to_string(), server.server_id).fetch_all(pool).await else {
            return response!(internal_server_error)
        };


        let mut tasks = vec![];
        for infraction in result {
            let task = task::spawn(async move {
                let new_infraction = match fetch_infraction(&infraction.infraction_id).await {
                    Ok(result) => Some(result),
                    Err(e) => {
                        tracing::warn!("Something went wrong fetching {}: {e}", infraction.infraction_id);
                        None
                    }
                };
                InfractionCombined {
                    new_infraction,
                    old_infraction: infraction.into(),
                }
            });

            tasks.push(task);
        }

        let fake_update: Vec<InfractionCombined> = join_all(tasks)
            .await
            .into_iter()
            .filter_map(Result::ok)
            .collect();
        response!(ok PlayerInfractionUpdate {
            id: player_id.0,
            infractions: fake_update.iter_into(),
        })
    }
    #[oai(path = "/servers/:server_id/players/:player_id/infractions", method = "get")]
    async fn get_player_infractions(&self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_id: Path<i64>) -> Response<Vec<PlayerInfraction>> {
        let pool = &data.pool;
        let Ok(result) = sqlx::query_as!(DbPlayerInfraction, "
            SELECT 
                infraction_id,
                payload->>'reason' reason, 
                payload->'admin'->>'admin_name' as by,
				payload->'admin'->>'avatar_id' as admin_avatar,
				(payload->>'flags')::bigint flags,
                to_timestamp((payload->>'created')::double precision::bigint) infraction_time
            FROM public.server_infractions
            WHERE payload->'player' ? 'gs_id'
                AND payload->>'server_id' = $2
                AND payload->'player'->>'gs_id' = $1
            ORDER BY infraction_time DESC
        ", player_id.0.to_string(), server.server_id).fetch_all(pool).await else {
			return response!(internal_server_error)
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/servers/:server_id/players/:player_id/detail", method = "get")]
    async fn get_player_detail(&self, Data(data): Data<&AppData>, player: PlayerExtractor) -> Response<DetailedPlayer>{
        let pool = &data.pool;
        let player_id = player.player.player_id;
        let server = player.server;
        let future = || sqlx::query_as!(DbPlayerDetail, "
            WITH filtered_pss AS (
                SELECT *
                FROM player_server_session
                WHERE player_id = $1 AND server_id = $2
            ),
            user_played AS (
              SELECT
                  mp.server_id,
                  mp.map,
                  SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
              FROM filtered_pss pss
              JOIN server_map_played sm
                ON sm.server_id = pss.server_id
              JOIN server_map mp
                ON mp.map = sm.map
               AND mp.server_id = sm.server_id
              WHERE pss.started_at < sm.ended_at
                AND pss.ended_at > sm.started_at
              GROUP BY mp.server_id, mp.map
            ),
            categorized AS (
              SELECT
                  mp.server_id,
                  COALESCE(mp.is_casual, false) AS casual,
                  COALESCE(mp.is_tryhard, false) AS tryhard,
                  SUM(up.played) AS total
              FROM user_played up
              LEFT JOIN server_map mp
                ON mp.map = up.map
               AND mp.server_id = up.server_id
              GROUP BY mp.server_id, mp.is_casual, mp.is_tryhard
            ),
            hard_or_casual AS (
              SELECT
                  server_id,
                  CASE WHEN tryhard THEN false ELSE casual END AS is_casual,
                  CASE WHEN tryhard THEN true ELSE false END AS is_tryhard,
                  SUM(total) AS summed
              FROM categorized
              GROUP BY server_id, is_casual, is_tryhard
            ),
            ranked_data AS (
              SELECT *,
                  SUM(summed) OVER() AS full_play
              FROM hard_or_casual
            ),
            categorized_data AS (
              SELECT
                  SUM(CASE WHEN is_tryhard THEN summed ELSE INTERVAL '0 seconds' END) AS tryhard_playtime,
                  SUM(CASE WHEN is_casual THEN summed ELSE INTERVAL '0 seconds' END) AS casual_playtime
              FROM ranked_data
            ),
            all_time_play AS (
              SELECT playtime, rank FROM (
                SELECT
                    s.player_id,
                    s.playtime,
                    RANK() OVER(ORDER BY s.playtime DESC) AS rank
                FROM (
                  SELECT
                      player_id,
                      SUM(
                        CASE
                          WHEN ended_at IS NULL
                               AND CURRENT_TIMESTAMP - started_at > INTERVAL '12 hours'
                          THEN INTERVAL '0 second'
                          ELSE COALESCE(ended_at, CURRENT_TIMESTAMP) - started_at
                        END
                      ) AS playtime
                  FROM player_server_session
                  WHERE server_id = $2
                  GROUP BY player_id
                ) s
              ) t
              WHERE t.player_id = $1
            ),
            last_played_detail AS (
              SELECT started_at, ended_at
              FROM player_server_session
              WHERE player_id = $1 AND server_id = $2
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
                  WHEN EXTRACT(EPOCH FROM cd.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 0) <= 0.3 THEN 'casual'
                  WHEN EXTRACT(EPOCH FROM cd.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 0) >= 0.7 THEN 'tryhard'
                  WHEN EXTRACT(EPOCH FROM cd.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 0) BETWEEN 0.4 AND 0.6 THEN 'mixed'
                  ELSE null
                END AS category,
                (
                  SELECT map
                  FROM user_played
                  ORDER BY played DESC
                  LIMIT 1
                ) AS favourite_map,
                tp.rank::int,
                (
                  SELECT started_at
                  FROM player_server_session s
                  WHERE ended_at IS NULL
                    AND s.player_id = su.player_id
                    AND CURRENT_TIMESTAMP - started_at < INTERVAL '12 hours'
                    AND server_id = $2
                  LIMIT 1
                ) AS online_since,
                lp.ended_at AS last_played,
                lp.ended_at - lp.started_at AS last_played_duration
            FROM player su
            JOIN categorized_data cd ON true
            JOIN all_time_play tp ON true
            JOIN last_played_detail lp ON true
            WHERE su.player_id = $1
            LIMIT 1
        ", player_id, server.server_id).fetch_one(pool);
        let key = format!("player_detail:{}:{}", player_id, player.cache_key);
        let Ok(result) = cached_response(&key, &data.redis_pool, 60 * DAY, future).await else {
            tracing::warn!("Unable to display player detail!");
            return response!(internal_server_error)
        };
        let mut details: DetailedPlayer = result.result.clone().into();

        if !result.is_new{
            let players: Vec<DbPlayerBrief> = vec![result.result.into()];
            let mut briefs = players.iter_into();
            update_online_brief(&pool, &data.redis_pool, &server.server_id, &mut briefs).await;
            let updated = briefs.first().expect("Did you forget or what?");
            details.last_played = updated.last_played;
            details.online_since = updated.online_since;
            details.last_played_duration = updated.last_played_duration;
        }
        let Ok(aliases) = sqlx::query_as!(DbPlayerAlias, "
            SELECT event_value as name, created_at FROM player_activity
            WHERE event_name='name' AND player_id=$1
            ORDER BY created_at
        ", player_id).fetch_all(pool).await else {
            tracing::warn!("Unable to display player alias!");
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
    #[oai(path = "/servers/:server_id/players/:player_id/pfp", method = "get")]
    async fn get_player_pfp(
        &self, Data(app): Data<&AppData>, ServerExtractor(_server): ServerExtractor, player_id: Path<i64>
    ) -> Response<PlayerProfilePicture>{
        let Some(provider) = &app.steam_provider else {
            return response!(err "This feature is disabled.", ErrorCode::NotImplemented)
        };

        let Ok(profile) = get_profile(&app.redis_pool, provider, &player_id.0).await else {
            tracing::warn!("Provider is broken");
            return response!(err "Broken", ErrorCode::InternalServerError)
        };

        let url_medium = match profile.url.split_once("_full"){
            Some((medium, ext)) => format!("{medium}_medium{ext}"),
            None => profile.url.clone()
        };
        response!(ok PlayerProfilePicture{
            id: player_id.0.to_string(),
            full: profile.url,
            medium: url_medium
        })
    }
    #[oai(path="/servers/:server_id/players/:player_id/most_played_maps", method="get")]
    async fn get_player_most_played(
        &self, data: Data<&AppData>, player: PlayerExtractor
    ) -> Response<Vec<PlayerMostPlayedMap>>{
        let server = player.server;
        let player_id = player.player.player_id;
        let func = || sqlx::query_as!(DbPlayerMapPlayed, "
            SELECT
                mp.server_id,
                mp.map,
                SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
            FROM player_server_session pss
            JOIN server_map_played sm
            	ON sm.server_id = pss.server_id
            JOIN server_map mp
                ON sm.map=mp.map AND sm.server_id=mp.server_id
            WHERE pss.player_id=$1 AND pss.server_id=$2
            	AND pss.started_at < sm.ended_at
            	AND pss.ended_at   > sm.started_at
            GROUP BY mp.server_id, mp.map
            ORDER BY played DESC
            LIMIT 10
        ", player_id, server.server_id).fetch_all(&data.pool);
        let key = format!("player-most-played:{}:{}:{}", server.server_id, player_id, player.cache_key);
        let Ok(result) = cached_response(&key, &data.redis_pool, 60 * DAY, func).await else {
            return response!(ok vec![])
        };
        response!(ok result.result.iter_into())
    }
    #[oai(path="/servers/:server_id/players/:player_id/regions", method="get")]
    async fn get_player_region(
        &self, Data(data): Data<&AppData>, extractor: PlayerExtractor
    ) -> Response<Vec<PlayerRegionTime>>{
        let server = extractor.server;
        let player_id = extractor.player.player_id;
        let func = || sqlx::query_as!(DbPlayerRegionTime, "
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
                WHERE player_id = $1 AND server_id=$2
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
        ", player_id, server.server_id)
            .fetch_all(&data.pool);
        let key = format!("player-region:{}:{}:{}", server.server_id, player_id, extractor.cache_key);
        let Ok(result) = cached_response(&key, &data.redis_pool, 60 * DAY, func)
            .await else {
                return response!(internal_server_error)
            };

        response!(ok result.result.iter_into())
    }
}
impl UriPatternExt for PlayerApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/servers/{server_id}/players/autocomplete",
            "/servers/{server_id}/players/search",
            "/servers/{server_id}/players/{player_id}/graph/sessions",
            "/servers/{server_id}/players/{player_id}/infraction_update",
            "/servers/{server_id}/players/{player_id}/infractions",
            "/servers/{server_id}/players/{player_id}/detail",
            "/servers/{server_id}/players/{player_id}/pfp",
            "/servers/{server_id}/players/{player_id}/most_played_maps",
            "/servers/{server_id}/players/{player_id}/regions",
        ].iter_into()
    }
}
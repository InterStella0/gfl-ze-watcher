use chrono::{DateTime, Utc};
use deadpool_redis::redis::{AsyncCommands};
use poem::web::Data;
use poem_openapi::{param::{Path, Query}, OpenApi};
use redis::RedisResult;
use serde::{Deserialize, Deserializer};
use futures::future::join_all;
use tokio::task;
use crate::model::{DbPlayer, DbPlayerAlias, DbPlayerBrief};
use crate::routers::api_models::{BriefPlayers, DetailedPlayer, PlayerInfraction, PlayerMostPlayedMap, PlayerProfilePicture, PlayerRegionTime, PlayerSessionTime, ProviderResponse, SearchPlayer, ErrorCode, Response, PlayerInfractionUpdate, ServerExtractor};
use crate::{model::{DbPlayerDetail, DbPlayerInfraction, DbPlayerMapPlayed, DbPlayerRegionTime,
                    DbPlayerSessionTime}, response, utils::IterConvert, AppData};
use crate::utils::{cached_response, update_online_brief};

pub struct PlayerApi;
const REDIS_CACHE_TTL: u64 = 5 * 24 * 60 * 60;


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

#[OpenApi]
impl PlayerApi{
    #[oai(path = "/servers/:server_id/players/autocomplete", method = "get")]
    async fn get_players_autocomplete(
        &self, data: Data<&AppData>, ServerExtractor(_server): ServerExtractor, player_name: Query<String>
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
    #[oai(path = "/servers/:server_id/players/search", method = "get")]
    async fn get_players_search(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_name: Query<String>, page: Query<usize>
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
                WHERE p.player_id=(SELECT target FROM VARS)
                    AND ps.server_id=$4
                    OR LOWER(p.player_name) LIKE CONCAT('%', (SELECT target FROM VARS), '%')
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
                        WHERE server_id=$4
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
                    AND server_id=$4
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
				WHERE server_id=$4
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
        ", format!("%{}%", player_name.0), paging, pagination, server.server_id)
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
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_id: Path<i64>
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
            WHERE player_id = $1 AND server_id=$2
            GROUP BY bucket_time
            ORDER BY bucket_time;
        ", player_id.0.to_string(), server.server_id).fetch_all(pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
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
    async fn get_player_detail(&self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_id: Path<i64>) -> Response<DetailedPlayer>{
        let pool = &data.0.pool;
        let player_id = player_id.0.to_string();
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
                               AND now() - started_at > INTERVAL '12 hours'
                          THEN INTERVAL '0 second'
                          ELSE COALESCE(ended_at, now()) - started_at
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
                    AND now() - started_at < INTERVAL '12 hours'
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
        let key = format!("player_detail:{player_id}");
        let Ok(result) = cached_response(&key, &data.redis_pool, 6 * 60 * 60, future).await else {
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
        &self, data: Data<&AppData>, ServerExtractor(_server): ServerExtractor, player_id: Path<i64>
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
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_id: Path<i64>
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
            WHERE pss.player_id=$1 AND pss.server_id=$2
            	AND pss.started_at < sm.ended_at
            	AND pss.ended_at   > sm.started_at
            GROUP BY mp.server_id, mp.map
            ORDER BY played DESC
            LIMIT 10
        ", player_id.0.to_string(), server.server_id).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path="/servers/:server_id/players/:player_id/regions", method="get")]
    async fn get_player_region(&self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_id: Path<i64>) -> Response<Vec<PlayerRegionTime>>{
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
        ", player_id.0.to_string(), server.server_id)
            .fetch_all(&data.0.pool)
            .await else {
                return response!(internal_server_error)
            };

        response!(ok result.iter_into())
    }

}
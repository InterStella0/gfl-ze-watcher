use chrono::{DateTime, Utc};
use poem::web::Data;
use poem_openapi::{param::{Path, Query}, OpenApi};
use serde::{Deserialize, Deserializer};
use futures::future::join_all;
use poem::http::StatusCode;
use sqlx::{Pool, Postgres};
use tokio::task;
use crate::model::{DbPlayer, DbPlayerAlias, DbPlayerBrief, DbPlayerHourCount, DbPlayerSeen, DbPlayerSession, DbPlayerWithLegacyRanks, DbServer};
use crate::routers::api_models::{BriefPlayers, DetailedPlayer, PlayerInfraction, PlayerMostPlayedMap, PlayerProfilePicture, PlayerRegionTime, PlayerSessionTime, SearchPlayer, ErrorCode, Response, PlayerInfractionUpdate, ServerExtractor, UriPatternExt, RoutePattern, PlayerSeen, PlayerSession, PlayerHourDay, PlayerWithLegacyRanks};
use crate::{model::{DbPlayerDetail, DbPlayerInfraction, DbPlayerMapPlayed, DbPlayerRegionTime,
                    DbPlayerSessionTime}, response, utils::IterConvert, AppData, FastCache};
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
async fn get_cache_key(pool: &Pool<Postgres>, cache: &FastCache, server_id: &str, player_id: &str) -> String{
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
    let Ok(result) = cached_response(&key, cache, 60, func).await else {
        return "first-time".to_string();
    };

    result.result.session_id
}
async fn get_player(pool: &Pool<Postgres>, cache: &FastCache, player_id: &str) -> Option<DbPlayer>{
    let func = || sqlx::query_as!(DbPlayer,
            "SELECT player_id, player_name, created_at, associated_player_id
             FROM player
             WHERE player_id=$1
             LIMIT 1
            ",
            player_id.to_string()
        ).fetch_one(pool);

    let key = format!("player-data:{player_id}");
    match cached_response(&key, cache, 120 * DAY, func).await {
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
        let redis_pool = &app_data.cache;
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

        let Some(player) = get_player(&data.pool, &data.cache, &player_id).await else {
            return Err(poem::Error::from_string("Player not found", StatusCode::NOT_FOUND))
        };

        let Some(server) = get_server(&data.pool, &data.cache, &server_id).await else {
            return Err(poem::Error::from_string("Server not found", StatusCode::NOT_FOUND))
        };

        Ok(PlayerExtractor::new(data, server, player).await)
    }
}


#[OpenApi]
impl PlayerApi{
    #[oai(path = "/servers/:server_id/players/autocomplete", method = "get")]
    async fn get_players_autocomplete(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, Query(player_name): Query<String>
    ) -> Response<Vec<SearchPlayer>>{
        let Ok(result) = sqlx::query_as!(DbPlayer, "
            SELECT a.player_id, player_name, created_at, associated_player_id
            FROM (
                SELECT *,
                       CASE WHEN player_id = $2 THEN 0 ELSE 1 END AS id_rank,
                       NULLIF(STRPOS(LOWER(player_name), LOWER($2)), 0) AS name_rank
                FROM player
                WHERE player_id = $2 OR player_name ILIKE '%' || $1 || '%'
            ) a
            WHERE EXISTS (
                SELECT 1
                FROM player_server_session pss
                WHERE pss.player_id = a.player_id
                  AND pss.server_id = $3
            )
            ORDER BY id_rank ASC, name_rank ASC NULLS LAST
            LIMIT 20;
        ", format!("%{}%", player_name.to_lowercase()), player_name, server.server_id
        ).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/servers/:server_id/players/search", method = "get")]
    async fn get_players_search(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, Query(player_name): Query<String>, page: Query<usize>
    ) -> Response<BriefPlayers>{
        let pagination = 40;
        let paging = page.0 as i64 * pagination;
        let player_name = player_name.trim();
        if player_name.is_empty() || player_name.len() < 2{
            return response!(ok BriefPlayers{ players: vec![], total_players: 0 })
        }
        let Ok(result) = sqlx::query_as!(DbPlayerBrief, "
            SELECT
                COUNT(*) OVER() AS total_players,
                p.player_id,
                p.player_name,
                p.created_at,
                lps.ended_at AS last_played,
                (lps.ended_at - lps.started_at) AS last_played_duration,
                INTERVAL '0 seconds' AS total_playtime,
                0 AS rank,
                lps.ended_at AS online_since
            FROM player p
            LEFT JOIN LATERAL (
                SELECT started_at, ended_at
                FROM player_server_session ps
                WHERE ps.player_id = p.player_id
                  AND ps.server_id = $4
                  AND ps.ended_at IS NOT NULL
                ORDER BY ended_at DESC
                LIMIT 1
            ) lps ON true
            WHERE EXISTS (
                SELECT 1
                FROM player_server_session ps2
                WHERE ps2.player_id = p.player_id
                  AND ps2.server_id = $4
            )
            AND (
                p.player_id = $1
                OR p.player_name ILIKE CONCAT('%', $1, '%')
            )
            ORDER BY
                CASE
                    WHEN p.player_id = $1 THEN 0
                    ELSE 1
                END,
                similarity(p.player_name, $1) DESC
            LIMIT $3 OFFSET $2;
        ", player_name, paging, pagination, server.server_id)
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
    #[oai(path="/servers/:server_id/players/:player_id/legacy_stats", method="get")]
    async fn get_legacy_stats(&self, Data(app): Data<&AppData>, extract: PlayerExtractor) -> Response<PlayerWithLegacyRanks>{
        if extract.server.server_id != "65bdad6379cefd7ebcecce5c"{
            return response!(err "Server does not have this stats", ErrorCode::NotFound)
        }
        let pool = &app.pool;
        let redis_pool = &app.cache;
        let player_id = extract.player.player_id;
        let server_id = extract.server.server_id;
        let func = || sqlx::query_as!(DbPlayerWithLegacyRanks, "
            WITH ranked AS (
              SELECT
                steamid64,
                points,
                human_time,
                zombie_time,
                zombie_killed,
                headshot,
                infected_time,
                item_usage,
                boss_killed,
                leader_count,
                td_count,
                RANK() OVER (ORDER BY human_time + zombie_time DESC) AS rank_total_playtime,
                RANK() OVER (ORDER BY zombie_time DESC) AS rank_zombie_time,
                RANK() OVER (ORDER BY points DESC) AS rank_points,
                RANK() OVER (ORDER BY human_time DESC) AS rank_human_time,
                RANK() OVER (ORDER BY zombie_killed DESC) AS rank_zombie_killed,
                RANK() OVER (ORDER BY headshot DESC) AS rank_headshot,
                RANK() OVER (ORDER BY infected_time DESC) AS rank_infected_time,
                RANK() OVER (ORDER BY item_usage DESC) AS rank_item_usage,
                RANK() OVER (ORDER BY boss_killed DESC) AS rank_boss_killed,
                RANK() OVER (ORDER BY leader_count DESC) AS rank_leader_count,
                RANK() OVER (ORDER BY td_count DESC) AS rank_td_count
              FROM legacy_gfl.players
            )
            SELECT *
            FROM ranked
            WHERE steamid64 = $1
            LIMIT 1
        ", player_id).fetch_one(pool);

        let key = format!("player-legacy:{server_id}:{player_id}:legacy");
        let Ok(result) = cached_response(&key, redis_pool, 120 * DAY, func).await else {
            return response!(err "Player has no cstats.", ErrorCode::NotFound)
        };
        response!(ok result.result.into())
    }
    #[oai(path="/servers/:server_id/players/:player_id/playing", method="get")]
    async fn get_last_playing(&self, Data(app): Data<&AppData>, extract: PlayerExtractor) -> Response<PlayerSession>{
        let pool = &app.pool;
        let redis_pool = &app.cache;
        let player_id = extract.player.player_id;
        let server_id = extract.server.server_id;
        let func = || sqlx::query_as!(DbPlayerSession, "
            SELECT session_id, server_id, player_id, started_at, ended_at
            FROM player_server_session
            WHERE server_id=$1 AND player_id=$2
            ORDER BY started_at DESC
            LIMIT 1
        ", server_id, player_id).fetch_one(pool);

        let key = format!("player-playing:{server_id}:{player_id}");
        let Ok(result) = cached_response(&key, redis_pool, 2 * 60, func).await else {
            return response!(internal_server_error)
        };
        response!(ok result.result.into())
    }
    #[oai(path = "/servers/:server_id/players/:player_id/graph/sessions", method = "get")]
    async fn get_player_sessions(
        &self, data: Data<&AppData>, player: PlayerExtractor
    ) -> Response<Vec<PlayerSessionTime>>{
        let pool = &data.pool;
        let redis_pool = &data.cache;
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
    #[oai(path="/servers/:server_id/players/:player_id/hours_of_day", method="get")]
    async fn get_hours_of_day_player(&self, Data(data): Data<&AppData>, player: PlayerExtractor) -> Response<Vec<PlayerHourDay>>{
        let pool = &data.pool;
        let cache = &data.cache;
        let func = || sqlx::query_as!(DbPlayerHourCount, "
            WITH join_count AS (
                SELECT player_id, (
                    EXTRACT(hours FROM started_at AT TIME ZONE 'UTC')
                ) hours, COUNT(*) FROM public.player_server_session
                WHERE player_id=$2 AND server_id=$1
                GROUP BY player_id, hours
            ), leave_count AS (
                SELECT player_id, (
                    EXTRACT(hours FROM ended_at AT TIME ZONE 'UTC')
                ) hours, COUNT(*) FROM public.player_server_session
                WHERE player_id=$2 AND server_id=$1
                GROUP BY player_id, hours
            )
            SELECT
                gs hours,
                COALESCE(jc.count, 0) join_counted,
                COALESCE(lc.count, 0) leave_counted
            FROM generate_series(0, 23) gs
            LEFT JOIN join_count jc
            ON jc.hours=gs
            LEFT JOIN leave_count lc
            ON lc.hours=gs
            ORDER BY hours
        ", player.server.server_id, player.player.player_id).fetch_all(pool);


        let key = format!("player-hour-day:{}:{}:{}", player.server.server_id, player.player.player_id, player.cache_key);
        let Ok(result) = cached_response(&key, cache, 60 * DAY, func).await else {
            return response!(ok vec![])
        };
        let mut to_return = vec![];
        for data in result.result{
            let (join, leave) = data.into();
            to_return.push(join);
            to_return.push(leave);
        }
        response!(ok to_return)
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
    async fn get_player_infractions(&self, Data(data): Data<&AppData>, extract: PlayerExtractor) -> Response<Vec<PlayerInfraction>> {
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
        ", extract.player.player_id, extract.server.server_id).fetch_all(pool).await else {
			return response!(internal_server_error)
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/servers/:server_id/players/:player_id/detail", method = "get")]
    async fn get_player_detail(&self, Data(data): Data<&AppData>, player: PlayerExtractor) -> Response<DetailedPlayer>{
        let pool = &data.pool;
        let player_id = player.player.player_id;
        let server = player.server;
        // TODO: ERROR HERE FOR MULTI SERVER, Couldn't repro
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
                su.associated_player_id,
                cd.tryhard_playtime,
                cd.casual_playtime,
                tp.playtime AS total_playtime,
                CASE
                  WHEN tp.playtime < INTERVAL '10 hours' THEN null
                  WHEN EXTRACT(EPOCH FROM cd.casual_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 1) >= 0.6 THEN 'casual'
                  WHEN EXTRACT(EPOCH FROM cd.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 1) >= 0.6 THEN 'tryhard'
                  WHEN EXTRACT(EPOCH FROM cd.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 1) BETWEEN 0.4 AND 0.6 THEN 'mixed'
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
        let key = format!("player_detail:{}:{}:{}", server.server_id, player_id, player.cache_key);
        let Ok(result) = cached_response(&key, &data.cache, 60 * DAY, future).await else {
            tracing::warn!("Unable to display player detail!");
            return response!(internal_server_error)
        };
        let mut details: DetailedPlayer = result.result.clone().into();

        if !result.is_new{
            let players: Vec<DbPlayerBrief> = vec![result.result.into()];
            let mut briefs = players.iter_into();
            update_online_brief(&pool, &data.cache, &server.server_id, &mut briefs).await;
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
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor
    ) -> Response<PlayerProfilePicture>{
        let Some(provider) = &app.steam_provider else {
            return response!(err "This feature is disabled.", ErrorCode::NotImplemented)
        };
        let player_id = match extract.player.player_id.parse::<i64>() {
            Ok(p) => p,
            Err(_) => {
                if let Some(p_id) = extract.player.associated_player_id{
                    let Ok(converted) = p_id.parse::<i64>() else {
                        tracing::warn!("Found invalid player_id from associated_player_id.");
                        return response!(internal_server_error);
                    };
                    converted
                }else{
                    return response!(err "No profile picture!!", ErrorCode::NotFound);
                }
            }
        };

        let Ok(profile) = get_profile(&app.cache, provider, &player_id).await else {
            tracing::warn!("Provider is broken");
            return response!(err "Broken", ErrorCode::InternalServerError)
        };

        let url_medium = match profile.url.split_once("_full"){
            Some((medium, ext)) => format!("{medium}_medium{ext}"),
            None => profile.url.clone()
        };
        response!(ok PlayerProfilePicture{
            id: extract.player.player_id,
            full: profile.url,
            medium: url_medium
        })
    }
    #[oai(path="/servers/:server_id/players/:player_id/might_friends", method="get")]
    async fn get_player_approximate_friend(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor
    ) -> Response<Vec<PlayerSeen>>{
        let pool = &app.pool;
        let player_id = extract.player.player_id;
        let server_id = extract.server.server_id;
        // 2024-03-01 guaranteed start of dataset.
        let func = || sqlx::query_as!(DbPlayerSeen, "
            WITH vars AS (
                SELECT '2024-03-01'::timestamp AS start_time
            ), overlapping_sessions AS (
                SELECT
                    s1.player_id AS player,
                    s2.player_id AS seen_player,
                    s1.server_id,
                    LEAST(s1.ended_at, s2.ended_at) - GREATEST(s1.started_at, s2.started_at) AS overlap_duration,
                    LEAST(s1.ended_at, s2.ended_at) seen_on
                FROM player_server_session s1
                CROSS JOIN LATERAL (
                    SELECT s2.player_id, s2.started_at, s2.ended_at
                    FROM player_server_session s2
                    WHERE s1.server_id = s2.server_id
                      AND s1.player_id <> s2.player_id
                      AND s1.started_at < s2.ended_at
                      AND s1.ended_at > s2.started_at
                ) s2
                WHERE (s1.started_at > (SELECT start_time FROM vars))
                  AND s1.player_id = $2
                  AND s1.server_id = $1
            )
            SELECT
                seen_player AS player_id,
                p.player_name,
                SUM(overlap_duration) AS total_time_together,
                MAX(seen_on) last_seen
            FROM overlapping_sessions
            JOIN player p
            ON p.player_id = seen_player
            GROUP BY seen_player, p.player_name
            ORDER BY total_time_together DESC
            LIMIT 10;
        ", server_id, player_id)
            .fetch_all(pool);

        let key = format!("player-seen:{}:{}:{}", server_id, player_id, extract.cache_key);
        let Ok(result) = cached_response(&key, &app.cache, 130 * DAY, func).await else {
            return response!(ok vec![])
        };
        response!(ok result.result.iter_into())
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
        let Ok(result) = cached_response(&key, &data.cache, 60 * DAY, func).await else {
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
        let Ok(result) = cached_response(&key, &data.cache, 60 * DAY, func)
            .await else {
                return response!(internal_server_error)
            };

        response!(ok result.result.iter_into())
    }
}
impl UriPatternExt for PlayerApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/servers/{server_id}/players/{player_id}/playing",
            "/servers/{server_id}/players/autocomplete",
            "/servers/{server_id}/players/search",
            "/servers/{server_id}/players/{player_id}/graph/sessions",
            "/servers/{server_id}/players/{player_id}/infraction_update",
            "/servers/{server_id}/players/{player_id}/infractions",
            "/servers/{server_id}/players/{player_id}/detail",
            "/servers/{server_id}/players/{player_id}/pfp",
            "/servers/{server_id}/players/{player_id}/most_played_maps",
            "/servers/{server_id}/players/{player_id}/regions",
            "/servers/{server_id}/players/{player_id}/might_friends",
            "/servers/{server_id}/players/{player_id}/legacy_stats",
            "/servers/{server_id}/players/{player_id}/hours_of_days",
        ].iter_into()
    }
}
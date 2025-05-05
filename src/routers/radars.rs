use std::fmt::{Display, Formatter};
use std::ops::Add;
use chrono::{DateTime, TimeDelta, Utc};
use poem::web::Data;
use poem_openapi::{Enum, OpenApi};
use poem_openapi::param::Query;
use crate::{response, AppData};
use crate::model::{DbCountryGeometry, DbCountryPlayer, DbCountryStatistic};
use crate::routers::api_models::{CountriesStatistics, CountryPlayers, Response, RoutePattern, ServerExtractor, UriPatternExt};
use crate::utils::{cached_response, ChronoToTime, IterConvert, DAY};

pub struct RadarApi;

#[derive(Enum)]
#[oai(rename_all = "lowercase")]
pub enum TimeInterval{
    Min10,
    Min30,
    Hour1,
    Hour6,
    Hour12,
    Day1,
    Week1,
    Month1,
}

impl Display for TimeInterval {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            TimeInterval::Min10 => f.write_str("10min"),
            TimeInterval::Min30 => f.write_str("30min"),
            TimeInterval::Hour1 => f.write_str("1hour"),
            TimeInterval::Hour6 => f.write_str("6hour"),
            TimeInterval::Hour12 => f.write_str("12hour"),
            TimeInterval::Day1 => f.write_str("1day"),
            TimeInterval::Week1 => f.write_str("1week"),
            TimeInterval::Month1 => f.write_str("1month"),
        }
    }
}
fn interval_to_date(start: &DateTime<Utc>, interval: &TimeInterval) -> DateTime<Utc> {
    let offset = match interval{
        TimeInterval::Min10 => TimeDelta::minutes(10),
        TimeInterval::Min30 => TimeDelta::minutes(30),
        TimeInterval::Hour1 => TimeDelta::hours(1),
        TimeInterval::Hour6 => TimeDelta::hours(6),
        TimeInterval::Hour12 => TimeDelta::hours(12),
        TimeInterval::Day1 => TimeDelta::days(1),
        TimeInterval::Week1 => TimeDelta::weeks(1),
        TimeInterval::Month1 => TimeDelta::days(30) // Dont care, assume 30 days
    };
    start.add(offset)
}

#[OpenApi]
impl RadarApi {
    #[oai(path="/radars/:server_id/statistics", method="get")]
    async fn radar_statistics(
        &self, Data(app): Data<&AppData>,
        ServerExtractor(server): ServerExtractor,
        Query(time): Query<DateTime<Utc>>,
        Query(interval): Query<TimeInterval>
    ) -> Response<CountriesStatistics> {
        let server_id = server.server_id;
        let func = || sqlx::query_as!(DbCountryStatistic, "
            WITH vars AS (
              SELECT
                $2::timestamptz AS start_date,
                $3::timestamptz AS end_date,
                $1 AS server_id
            ),
            filtered_pss AS (
              SELECT
                  fid,
                  player_id,
                  player_name,
                  created_at,
                  started_at,
                  COALESCE(ended_at, CURRENT_TIMESTAMP),
                  server_id,
                  location_country,
                  geometry
              FROM public.player_server_timed
              WHERE server_id = (SELECT server_id FROM vars)
                AND ((started_at <= (SELECT end_date FROM vars) AND ended_at >= (SELECT start_date FROM vars))
                    OR
                     (ended_at IS NULL AND started_at >= (SELECT start_date FROM vars)
                          AND (CURRENT_TIMESTAMP - started_at) < INTERVAL '12 hours')
                )
            ),
            total_player_counts AS (
              SELECT
                COUNT(DISTINCT player_id) AS c
              FROM player_server_session
              WHERE server_id = (SELECT server_id FROM vars)
                AND started_at <= (SELECT end_date FROM vars)
                AND ended_at >= (SELECT start_date FROM vars)
            ),
            deduplicated_countries AS (
              SELECT
                \"ISO_A2_EH\" AS country_code,
                MIN(\"NAME\") AS country_name
              FROM layers.countries_fixed
              GROUP BY \"ISO_A2_EH\"
            )
            SELECT
                dc.country_name country_name,
                location_country AS country_code,
                COUNT(DISTINCT player_id) AS players_per_country,
                (SELECT c FROM total_player_counts) AS total_players
            FROM filtered_pss fps
            LEFT JOIN deduplicated_countries dc
              ON dc.country_code = fps.location_country
            GROUP BY location_country, dc.country_name
            ORDER BY players_per_country DESC
        ", server_id, time.to_db_time(), interval_to_date(&time, &interval).to_db_time())
            .fetch_all(&app.pool);
        let key = format!("db-statistics:{server_id}:{}:{}", time.to_string(), interval.to_string());
        let Ok(result) = cached_response(&key, &app.redis_pool, 2 * 60, func).await else {
            tracing::warn!("Unable to cache db-statistics");
            return response!(internal_server_error)
        };
        let data = result.result;
        let total = data.first().and_then(|m| m.total_players).unwrap_or(0);
        let available = data.iter().filter_map(|m| m.players_per_country).sum();
        let stats = CountriesStatistics{
            in_view_count: available,
            total_count: total,
            countries: data.iter_into()
        };
        response!(ok stats)
    }
    #[oai(path="/radars/:server_id/live_statistics", method="get")]
    async fn radar_statistic_live(
        &self, Data(app): Data<&AppData>,
        ServerExtractor(server): ServerExtractor,
    ) -> Response<CountriesStatistics> {
        let server_id = server.server_id;
        let func = || sqlx::query_as!(DbCountryStatistic, "
            WITH vars AS (
              SELECT
                $1 AS server_id,
                CURRENT_TIMESTAMP - INTERVAL '12 hours' AS currently
            ),
            filtered_pss AS (
              SELECT *
              FROM public.player_server_mapped
              WHERE server_id = (SELECT server_id FROM vars)
            ),
            total_player_counts AS (
              SELECT
                 LEAST(COUNT(DISTINCT player_id), 64) AS c
              FROM player_server_session
              WHERE server_id = (SELECT server_id FROM vars)
                AND started_at >= (SELECT currently FROM vars)
                AND ended_at IS NULL
            ),
            deduplicated_countries AS (
              SELECT
                \"ISO_A2_EH\" AS country_code,
                MIN(\"NAME\") AS country_name
              FROM layers.countries_fixed
              GROUP BY \"ISO_A2_EH\"
            )
            SELECT
                dc.country_name country_name,
                location_country AS country_code,
                COUNT(DISTINCT player_id) AS players_per_country,
                (SELECT c FROM total_player_counts) AS total_players
            FROM filtered_pss fps
            LEFT JOIN deduplicated_countries dc
              ON dc.country_code = fps.location_country
            GROUP BY location_country, dc.country_name
            ORDER BY players_per_country DESC
        ", server_id)
            .fetch_all(&app.pool);
        let key = format!("live-statistics:{server_id}");
        let Ok(result) = cached_response(&key, &app.redis_pool, 30, func).await else {
            tracing::warn!("Unable to cache live-statistics");
            return response!(internal_server_error)
        };
        let data = result.result;
        let total = data.first().and_then(|m| m.total_players).unwrap_or(0);
        let available = data.iter().filter_map(|m| m.players_per_country).sum();

        let stats = CountriesStatistics{
            in_view_count: available,
            total_count: total.max(available),
            countries: data.iter_into()
        };
        response!(ok stats)
    }
    #[oai(path="/radars/:server_id/live_query", method="get")]
    async fn radar_query_live(
        &self, Data(app): Data<&AppData>,
        ServerExtractor(server): ServerExtractor,
        Query(latitude): Query<f64>,
        Query(longitude): Query<f64>,
        Query(page): Query<usize>
    ) -> Response<CountryPlayers> {
        let offset = (page * 10) as i64;
        let server_id = server.server_id;
        let redis_pool = &app.redis_pool;
        let func = || sqlx::query_as!(DbCountryPlayer, "
            WITH vars AS (
              SELECT
                ST_SetSRID(ST_MakePoint($2, $3), 4326) AS pt,
                $1 AS server_id
            ),
            filtered_country AS (
                SELECT \"ISO_A2_EH\" as country_code, \"NAME\" as name, geom
                FROM layers.countries_fixed, vars
                WHERE ST_Contains(geom, vars.pt)
                LIMIT 1
            )
            SELECT
                pst.player_id,
                pst.player_name,
                pst.location_country,
                SUM(CURRENT_TIMESTAMP - pst.started_at) total_playtime,
                1::bigint session_count,
                COUNT(*) OVER () total_player_count
            FROM public.player_server_mapped pst
            RIGHT JOIN filtered_country fc
                ON fc.country_code = pst.location_country
            WHERE server_id = (SELECT server_id FROM vars)
            GROUP BY pst.player_id, pst.player_name, pst.location_country
            ORDER BY total_playtime DESC
            OFFSET $4
            LIMIT 10
        ",
            server_id,
            longitude,
            latitude,
            offset).fetch_all(&app.pool);
        let key = format!("query-country-live:{server_id}:{latitude}:{longitude}:{offset}");
        let Ok(result) = cached_response(&key, redis_pool, 30, func).await else {
            tracing::warn!("Unable to cache query-country-live");
            return response!(internal_server_error)
        };
        let Some(player): Option<&DbCountryPlayer> = result.result.first() else {
            return response!(ok CountryPlayers{
                geojson: String::from("{}"),
                count: 0,
                name: "Unknown".to_string(),
                code: "Unknown".to_string(),
                players: vec![]
            })
        };
        let country_code = player.location_country.as_ref().map(String::clone).unwrap_or_else(|| "".to_string());
        let get_country_func = || sqlx::query_as!(DbCountryGeometry, "
            SELECT \"ISO_A2_EH\" as country_code, \"NAME\" as country_name, ST_AsGeoJSON(geom) geometry
            FROM layers.countries_fixed
            WHERE \"ISO_A2_EH\"=$1
            LIMIT 1
        ", country_code).fetch_one(&app.pool);
        let country_key = format!("country:{server_id}:{country_code}");
        let Ok(country_geometry) = cached_response(&country_key, redis_pool, 7 * DAY, get_country_func).await else {
            tracing::warn!("Unable to cache query-country");
            return response!(internal_server_error)
        };
        let country_geometry = country_geometry.result;
        response!(ok CountryPlayers{
            geojson: country_geometry.geometry.unwrap_or(String::from("{}")),
            count: player.total_player_count.unwrap_or_default(),
            code: country_geometry.country_code.unwrap_or_default(),
            name: country_geometry.country_name.unwrap_or_default(),
            players: result.result.iter_into(),
        })
    }
    #[oai(path="/radars/:server_id/query", method="get")]
    async fn radar_query(
        &self, Data(app): Data<&AppData>,
        ServerExtractor(server): ServerExtractor,
        Query(latitude): Query<f64>,
        Query(longitude): Query<f64>,
        Query(time): Query<DateTime<Utc>>,
        Query(interval): Query<TimeInterval>,
        Query(page): Query<usize>
    ) -> Response<CountryPlayers> {
        let offset = (page * 10) as i64;
        let server_id = server.server_id;
        let redis_pool = &app.redis_pool;
        let func = || sqlx::query_as!(DbCountryPlayer, "
            WITH vars AS (
              SELECT
                ST_SetSRID(ST_MakePoint($4, $5), 4326) AS pt,
                $2::timestamptz AS start_date,
                $3::timestamptz AS end_date,
                $1 AS server_id
            ),
            filtered_country AS (
                SELECT \"ISO_A2_EH\" as country_code, \"NAME\" as name, geom
                FROM layers.countries_fixed, vars
                WHERE ST_Contains(geom, vars.pt)
                LIMIT 1
            )
            SELECT
                pst.player_id,
                pst.player_name,
                pst.location_country,
                SUM(COALESCE(pst.ended_at, CURRENT_TIMESTAMP) - pst.started_at) total_playtime,
                COUNT(pst.fid) session_count,
                COUNT(*) OVER () total_player_count
            FROM public.player_server_timed pst
            RIGHT JOIN filtered_country fc
                ON fc.country_code = pst.location_country
            WHERE server_id = (SELECT server_id FROM vars)
                AND (
                    (started_at <= (SELECT end_date FROM vars) AND ended_at >= (SELECT start_date FROM vars))
                        OR
                    (ended_at IS NULL AND started_at >= (SELECT start_date FROM vars) AND
                        CURRENT_TIMESTAMP- started_at < INTERVAL '12 hours')
                )
            GROUP BY pst.player_id, pst.player_name, pst.location_country
            ORDER BY total_playtime DESC
            OFFSET $6
            LIMIT 10
        ",
            server_id,
            time.to_db_time(),
            interval_to_date(&time, &interval).to_db_time(),
            longitude,
            latitude,
            offset).fetch_all(&app.pool);
        let key = format!("query-country:{server_id}:{}:{}:{latitude}:{longitude}:{offset}", time.to_rfc3339(), interval.to_string());
        let Ok(result) = cached_response(&key, redis_pool, 30, func).await else {
            tracing::warn!("Unable to cache query-country");
            return response!(internal_server_error)
        };
        let Some(player): Option<&DbCountryPlayer> = result.result.first() else {
            return response!(ok CountryPlayers{
                geojson: String::from("{}"),
                count: 0,
                name: "Unknown".to_string(),
                code: "Unknown".to_string(),
                players: vec![]
            })
        };
        let country_code = player.location_country.as_ref().map(String::clone).unwrap_or_else(|| "".to_string());
        let get_country_func = || sqlx::query_as!(DbCountryGeometry, "
            SELECT \"ISO_A2_EH\" as country_code, \"NAME\" as country_name, ST_AsGeoJSON(geom) geometry
            FROM layers.countries_fixed
            WHERE \"ISO_A2_EH\"=$1
            LIMIT 1
        ", country_code).fetch_one(&app.pool);
        let country_key = format!("country:{server_id}:{country_code}");
        let Ok(country_geometry) = cached_response(&country_key, redis_pool, 7 * DAY, get_country_func).await else {
            tracing::warn!("Unable to cache query-country");
            return response!(internal_server_error)
        };
        let country_geometry = country_geometry.result;
        response!(ok CountryPlayers{
            geojson: country_geometry.geometry.unwrap_or(String::from("{}")),
            count: player.total_player_count.unwrap_or_default(),
            code: country_geometry.country_code.unwrap_or_default(),
            name: country_geometry.country_name.unwrap_or_default(),
            players: result.result.iter_into(),
        })
    }
}
impl UriPatternExt for RadarApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/radars/{server_id}/query",
            "/radars/{server_id}/live_query",
            "/radars/{server_id}/statistics",
            "/radars/{server_id}/live_statistics",
        ].iter_into()
    }
}
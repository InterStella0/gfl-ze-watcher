#![allow(dead_code)]
use serde::{Deserialize, Deserializer, Serializer};
use serde::ser::Error;
use sqlx::postgres::types::PgInterval;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

pub fn serialize_offsetdatetime<S>(datetime: &OffsetDateTime, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&datetime.format(&Rfc3339).map_err(Error::custom)?)
}

pub fn deserialize_offsetdatetime<'de, D>(deserializer: D) -> Result<OffsetDateTime, D::Error>
where
    D: Deserializer<'de>,
{
    let s: String = Deserialize::deserialize(deserializer)?;
    OffsetDateTime::parse(&s, &Rfc3339)
        .map_err(serde::de::Error::custom)
}

pub fn serialize_option_offsetdatetime<S>(datetime: &Option<OffsetDateTime>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match datetime {
        Some(dt) => serializer.serialize_str(&dt.format(&Rfc3339).map_err(Error::custom)?),
        None => serializer.serialize_none(),
    }
}

pub fn deserialize_option_offsetdatetime<'de, D>(deserializer: D) -> Result<Option<OffsetDateTime>, D::Error>
where
    D: Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    match s {
        Some(s) => OffsetDateTime::parse(&s, &Rfc3339)
            .map(Some)
            .map_err(serde::de::Error::custom),
        None => Ok(None),
    }
}


pub fn serialize_option_pginterval<S>(interval: &Option<PgInterval>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match interval {
        Some(interval) => serializer.serialize_str(&interval.microseconds.to_string()),
        None => serializer.serialize_none(),
    }
}

pub fn deserialize_option_pginterval<'de, D>(deserializer: D) -> Result<Option<PgInterval>, D::Error>
where
    D: Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    match s {
        Some(value) => value.parse::<i64>().map(|microseconds| Some(PgInterval {
            microseconds,
            days: 0,
            months: 0,
        })).map_err(serde::de::Error::custom),
        None => Ok(None),
    }
}


pub fn serialize_pginterval<S>(interval: PgInterval, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&interval.microseconds.to_string())
}
pub fn deserialize_pginterval<'de, D>(deserializer: D) -> Result<PgInterval, D::Error>
where
    D: Deserializer<'de>,
{
    let s: String = Deserialize::deserialize(deserializer)?;
    s.parse::<i64>().map(|microseconds| PgInterval {
        microseconds,
        days: 0,
        months: 0,
    }).map_err(serde::de::Error::custom)

}

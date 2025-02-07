use std::env;

use chrono::{DateTime, Utc};
use sqlx::types::time::OffsetDateTime;

pub fn get_env(name: &str) -> String{
    env::var(name).expect(&format!("Couldn't load environment '{name}'"))
}

pub trait ChronoToTime {
    fn to_db_time(&self) -> OffsetDateTime;
}
impl ChronoToTime for DateTime<Utc> {
    fn to_db_time(&self) -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(self.timestamp()).unwrap()
    }
}
pub fn retain_peaks<T: PartialEq + Clone>(points: Vec<T>, max_points: usize,
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
use std::path::{Path, PathBuf};

use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::{Client, config::Region};

use crate::core::utils::get_env_default;

#[derive(Clone)]
pub struct MapStorage {
    backend: MapStorageBackend,
    object_prefix: String,
    public_base_url: String,
}

#[derive(Clone)]
enum MapStorageBackend {
    Local { root: String },
    R2 { client: Client, bucket: String },
}

impl MapStorage {
    pub async fn from_env() -> Result<Self, String> {
        let backend = get_env_default("MAP_STORAGE_BACKEND")
            .unwrap_or_else(|| "local".to_string())
            .to_lowercase();

        let object_prefix = get_env_default("MAPS_OBJECT_PREFIX")
            .unwrap_or_default()
            .trim_matches('/')
            .to_string();

        let public_base_url = get_env_default("MAPS_PUBLIC_BASE_URL")
            .or_else(|| get_env_default("R2_PUBLIC_BASE_URL"))
            .unwrap_or_else(|| {
                if backend == "local" {
                    "/models/maps".to_string()
                } else {
                    String::new()
                }
            });

        if public_base_url.is_empty() {
            return Err("MAPS_PUBLIC_BASE_URL (or R2_PUBLIC_BASE_URL) is required".to_string());
        }

        match backend.as_str() {
            "local" => {
                let root = get_env_default("STORE_UPLOAD")
                    .unwrap_or_else(|| "./maps".to_string());
                Ok(Self {
                    backend: MapStorageBackend::Local { root },
                    object_prefix,
                    public_base_url,
                })
            }
            "r2" | "cloudflare" => {
                let endpoint = get_env_default("R2_ENDPOINT")
                    .ok_or("R2_ENDPOINT is required")?;
                let access_key = get_env_default("R2_ACCESS_KEY_ID")
                    .ok_or("R2_ACCESS_KEY_ID is required")?;
                let secret_key = get_env_default("R2_SECRET_ACCESS_KEY")
                    .ok_or("R2_SECRET_ACCESS_KEY is required")?;
                let bucket = get_env_default("R2_BUCKET")
                    .ok_or("R2_BUCKET is required")?;

                let credentials = Credentials::new(access_key, secret_key, None, None, "r2");
                let config = aws_sdk_s3::Config::builder()
                    .region(Region::new("auto"))
                    .endpoint_url(endpoint)
                    .credentials_provider(credentials)
                    .build();
                let client = Client::from_conf(config);

                Ok(Self {
                    backend: MapStorageBackend::R2 { client, bucket },
                    object_prefix,
                    public_base_url,
                })
            }
            other => Err(format!("Unsupported MAP_STORAGE_BACKEND: {other}")),
        }
    }

    pub fn is_local(&self) -> bool {
        matches!(self.backend, MapStorageBackend::Local { .. })
    }

    pub fn local_root(&self) -> Option<&str> {
        match &self.backend {
            MapStorageBackend::Local { root } => Some(root),
            _ => None,
        }
    }

    pub fn object_key(&self, map_name: &str, res_type: &str) -> String {
        let filename = format!("{map_name}_d_c_{res_type}.glb");
        if self.object_prefix.is_empty() {
            format!("{map_name}/{filename}")
        } else {
            format!("{}/{map_name}/{filename}", self.object_prefix)
        }
    }

    pub fn public_url(&self, map_name: &str, res_type: &str) -> String {
        let key = self.object_key(map_name, res_type);
        join_url(&self.public_base_url, &key)
    }

    pub fn local_path(&self, map_name: &str, res_type: &str) -> Option<PathBuf> {
        let root = self.local_root()?;
        let key = self.object_key(map_name, res_type);
        Some(Path::new(root).join(key))
    }

    pub async fn store_bytes(
        &self,
        map_name: &str,
        res_type: &str,
        bytes: &[u8],
    ) -> Result<String, String> {
        let key = self.object_key(map_name, res_type);
        match &self.backend {
            MapStorageBackend::Local { root } => {
                let path = Path::new(root).join(&key);
                if let Some(parent) = path.parent() {
                    tokio::fs::create_dir_all(parent)
                        .await
                        .map_err(|e| format!("Failed to create directory: {e}"))?;
                }
                tokio::fs::write(&path, bytes)
                    .await
                    .map_err(|e| format!("Failed to write file: {e}"))?;
                Ok(join_url(&self.public_base_url, &key))
            }
            MapStorageBackend::R2 { client, bucket } => {
                let body = ByteStream::from(bytes.to_vec());
                client
                    .put_object()
                    .bucket(bucket)
                    .key(&key)
                    .content_type("model/gltf-binary")
                    .body(body)
                    .send()
                    .await
                    .map_err(|e| format!("R2 upload failed: {e}"))?;
                Ok(join_url(&self.public_base_url, &key))
            }
        }
    }

    pub async fn store_file(
        &self,
        map_name: &str,
        res_type: &str,
        file_path: &Path,
    ) -> Result<String, String> {
        let key = self.object_key(map_name, res_type);
        match &self.backend {
            MapStorageBackend::Local { root } => {
                let target_path = Path::new(root).join(&key);
                if file_path != target_path {
                    if let Some(parent) = target_path.parent() {
                        tokio::fs::create_dir_all(parent)
                            .await
                            .map_err(|e| format!("Failed to create directory: {e}"))?;
                    }
                    tokio::fs::rename(file_path, &target_path)
                        .await
                        .map_err(|e| format!("Failed to move file: {e}"))?;
                }
                Ok(join_url(&self.public_base_url, &key))
            }
            MapStorageBackend::R2 { client, bucket } => {
                let body = ByteStream::from_path(file_path)
                    .await
                    .map_err(|e| format!("Failed to read file for upload: {e}"))?;
                client
                    .put_object()
                    .bucket(bucket)
                    .key(&key)
                    .content_type("model/gltf-binary")
                    .body(body)
                    .send()
                    .await
                    .map_err(|e| format!("R2 upload failed: {e}"))?;
                Ok(join_url(&self.public_base_url, &key))
            }
        }
    }

    pub async fn delete(&self, map_name: &str, res_type: &str) -> Result<(), String> {
        let key = self.object_key(map_name, res_type);
        match &self.backend {
            MapStorageBackend::Local { root } => {
                let path = Path::new(root).join(&key);
                if let Err(e) = tokio::fs::remove_file(&path).await {
                    return Err(format!("Failed to delete file {path:?}: {e}"));
                }
                Ok(())
            }
            MapStorageBackend::R2 { client, bucket } => {
                client
                    .delete_object()
                    .bucket(bucket)
                    .key(&key)
                    .send()
                    .await
                    .map_err(|e| format!("R2 delete failed: {e}"))?;
                Ok(())
            }
        }
    }
}

fn join_url(base: &str, key: &str) -> String {
    let base = base.trim_end_matches('/');
    let key = key.trim_start_matches('/');
    format!("{base}/{key}")
}

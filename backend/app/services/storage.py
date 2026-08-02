"""S3-compatible object storage wrapper.

Works against AWS S3, Cloudflare R2, or MinIO (local dev). Endpoint URL
discriminates which.
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import timedelta
from typing import BinaryIO

import boto3
from botocore.client import Config

from app.core.config import settings


class StorageService:
    def __init__(self):
        kwargs = dict(
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )
        if settings.S3_ENDPOINT_URL:
            kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
        self._client = boto3.client("s3", **kwargs)
        self._bucket = settings.S3_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except Exception:
            try:
                self._client.create_bucket(Bucket=self._bucket)
            except Exception:
                pass  # Bucket may already exist or we lack perms in cloud envs

    @staticmethod
    def make_key(user_id: str, filename: str) -> str:
        return f"users/{user_id}/{uuid.uuid4().hex}/{filename}"

    @staticmethod
    def sha256_of(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def upload(self, data: bytes, key: str, content_type: str) -> None:
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )

    def download(self, key: str) -> bytes:
        obj = self._client.get_object(Bucket=self._bucket, Key=key)
        return obj["Body"].read()

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)

    def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_in,
        )


_storage: StorageService | None = None


def get_storage() -> StorageService:
    global _storage
    if _storage is None:
        _storage = StorageService()
    return _storage

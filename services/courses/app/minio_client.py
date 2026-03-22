from minio import Minio
import os

MINIO_HOST = os.getenv("MINIO_HOST", "minio:9000")
MINIO_PUBLIC_HOST = os.getenv("MINIO_PUBLIC_HOST", "127.0.0.1:9000")
MINIO_USER = os.getenv("MINIO_USER", "minioadmin")
MINIO_PASSWORD = os.getenv("MINIO_PASSWORD", "minioadmin123")
BUCKET_NAME = "courses-files"

_client = None
_public_client = None


def get_minio_client():
    """Client interne Docker — pour upload/stockage"""
    global _client
    if _client is not None:
        return _client
    _client = Minio(
        MINIO_HOST,
        access_key=MINIO_USER,
        secret_key=MINIO_PASSWORD,
        secure=False
    )
    if not _client.bucket_exists(BUCKET_NAME):
        _client.make_bucket(BUCKET_NAME)
    return _client


def get_public_minio_client():
    """Client public — pour générer des presigned URLs accessibles depuis le navigateur"""
    global _public_client
    if _public_client is not None:
        return _public_client
    _public_client = Minio(
        MINIO_PUBLIC_HOST,
        access_key=MINIO_USER,
        secret_key=MINIO_PASSWORD,
        secure=False
    )
    return _public_client
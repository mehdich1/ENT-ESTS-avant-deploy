from minio import Minio
import os

MINIO_HOST = os.getenv("MINIO_HOST", "minio:9000")
MINIO_USER = os.getenv("MINIO_USER", "minioadmin")
MINIO_PASSWORD = os.getenv("MINIO_PASSWORD", "minioadmin123")
EXAMS_BUCKET = "exams-files"
DEVOIRS_BUCKET = "devoirs-files"

def get_minio_client():
    client = Minio(
        MINIO_HOST,
        access_key=MINIO_USER,
        secret_key=MINIO_PASSWORD,
        secure=False
    )
    return client
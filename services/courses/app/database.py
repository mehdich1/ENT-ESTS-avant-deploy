from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
import os

CASSANDRA_HOST = os.getenv("CASSANDRA_HOST", "cassandra")
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT", 9042))

_session = None

def get_session():
    global _session
    if _session:
        return _session

    cluster = Cluster(
        [CASSANDRA_HOST],
        port=CASSANDRA_PORT
    )
    _session = cluster.connect()

    # Créer le keyspace si inexistant
    _session.execute("""
        CREATE KEYSPACE IF NOT EXISTS ent_courses
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}
    """)

    # Utiliser le keyspace
    _session.set_keyspace("ent_courses")

    # Créer la table si inexistante
    _session.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id UUID PRIMARY KEY,
            title TEXT,
            description TEXT,
            teacher_id UUID,
            teacher_username TEXT,
            file_url TEXT,
            created_at TIMESTAMP
        )
    """)

    return _session
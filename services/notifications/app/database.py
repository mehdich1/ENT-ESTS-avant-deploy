from cassandra.cluster import Cluster
import os

CASSANDRA_HOST = os.getenv("CASSANDRA_HOST", "cassandra")
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT", 9042))
_session = None

def get_session():
    global _session
    if _session:
        return _session
    cluster = Cluster([CASSANDRA_HOST], port=CASSANDRA_PORT)
    _session = cluster.connect()
    _session.execute("""
        CREATE KEYSPACE IF NOT EXISTS ent_notifications
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}
    """)
    _session.set_keyspace("ent_notifications")
    _session.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY,
            user_id UUID,
            event_type TEXT,
            title TEXT,
            message TEXT,
            link TEXT,
            is_read BOOLEAN,
            created_at TIMESTAMP
        )
    """)
    return _session
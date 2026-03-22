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
        CREATE KEYSPACE IF NOT EXISTS ent_chat
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}
    """)
    _session.set_keyspace("ent_chat")
    _session.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY,
            room_id TEXT,
            sender_id UUID,
            sender_username TEXT,
            content TEXT,
            sent_at TIMESTAMP
        )
    """)
    _session.execute("""
        CREATE TABLE IF NOT EXISTS chat_rooms (
            id UUID PRIMARY KEY,
            name TEXT,
            description TEXT,
            restricted_to TEXT,
            created_by UUID,
            created_at TIMESTAMP
        )
    """)
    return _session
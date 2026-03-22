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
        CREATE KEYSPACE IF NOT EXISTS ent_exams
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}
    """)
    _session.set_keyspace("ent_exams")

    _session.execute("""
        CREATE TABLE IF NOT EXISTS exams (
            id UUID PRIMARY KEY,
            title TEXT,
            description TEXT,
            course_id UUID,
            teacher_id UUID,
            teacher_username TEXT,
            file_url TEXT,
            deadline TIMESTAMP,
            created_at TIMESTAMP
        )
    """)

    _session.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id UUID PRIMARY KEY,
            exam_id UUID,
            student_id UUID,
            student_username TEXT,
            file_url TEXT,
            grade FLOAT,
            submitted_at TIMESTAMP
        )
    """)

    return _session
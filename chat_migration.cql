-- Migration Cassandra — table chat_rooms
-- À exécuter : docker exec -it cassandra cqlsh -f /tmp/chat_migration.cql

USE ent_chat;

CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY,
    name TEXT,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ON chat_rooms (name);

-- Insérer une room "général" par défaut
INSERT INTO chat_rooms (id, name, description, created_by, created_at)
VALUES (uuid(), 'general', 'Room générale — tous les utilisateurs', null, toTimestamp(now()))
IF NOT EXISTS;

INSERT INTO chat_rooms (id, name, description, created_by, created_at)
VALUES (uuid(), 'enseignants', 'Room réservée aux enseignants', null, toTimestamp(now()))
IF NOT EXISTS;

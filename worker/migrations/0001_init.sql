-- Guestbook schema v1. Timestamps are UTC ISO 8601 strings ("YYYY-MM-DDTHH:MM:SS.sssZ"),
-- so lexicographic comparison matches chronological order.

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL DEFAULT 'Anon',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_messages_created_at ON messages (created_at);

-- One effective vote per anonymous browser identity and message.
-- visitor_hash = HMAC-SHA256(secret, "vote:<message_id>:<visitor_uuid>"); the raw UUID is never stored.
CREATE TABLE votes (
  message_id INTEGER NOT NULL,
  visitor_hash TEXT NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  PRIMARY KEY (message_id, visitor_hash),
  FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
);

-- Posting cooldown per anonymous browser identity.
-- visitor_hash = HMAC-SHA256(secret, "post:<visitor_uuid>"), unrelated to vote hashes.
CREATE TABLE post_cooldowns (
  visitor_hash TEXT PRIMARY KEY,
  last_post_at TEXT NOT NULL
);

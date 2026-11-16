CREATE TABLE post_quota (
  window_start INTEGER PRIMARY KEY,
  successful_posts INTEGER NOT NULL
);

-- Keep counts for existing messages when upgrading a database.
INSERT INTO post_quota (window_start, successful_posts)
SELECT (unixepoch(created_at) / 600) * 600, COUNT(*)
FROM messages
GROUP BY (unixepoch(created_at) / 600) * 600;

-- Record successful inserts in the same transaction. Moderation deletes do not refund quota.
CREATE TRIGGER count_successful_post
AFTER INSERT ON messages
BEGIN
  INSERT INTO post_quota (window_start, successful_posts)
  VALUES ((unixepoch(NEW.created_at) / 600) * 600, 1)
  ON CONFLICT (window_start)
  DO UPDATE SET successful_posts = successful_posts + 1;
END;

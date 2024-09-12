CREATE TABLE todo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT 0,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "schema_migrations" (version varchar(128) primary key);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20240912204444');

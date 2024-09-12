-- migrate:up
SELECT 'Changing to WAL mode - due to limitations of SQLite, execute separately w/ sqlite3 mydb.sqlite "PRAGMA journal_mode = WAL;"';

-- migrate:down
SELECT 'Changing to DELETE mode - due to limitations of SQLite, execute separately w/ sqlite3 mydb.sqlite "PRAGMA journal_mode = DELETE;"';
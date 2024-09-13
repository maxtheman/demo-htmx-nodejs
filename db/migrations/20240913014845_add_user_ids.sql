-- migrate:up
ALTER TABLE todo_items ADD COLUMN user_id TEXT;
CREATE INDEX idx_todo_items_user_id ON todo_items(user_id);


-- migrate:down
ALTER TABLE todo_items DROP COLUMN user_id;
DROP INDEX idx_todo_items_user_id;
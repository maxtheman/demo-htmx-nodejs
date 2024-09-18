import { Database } from "bun:sqlite";
import path from "path";

import { logger } from "./instrumentation.js";
const dbLocation = process.env.DATABASE_URL || "sqlite:./data/mydb.sqlite";
const dbFile = dbLocation.replace("sqlite:", "");

import { $ } from "bun";

// Resolve the path relative to the current directory
const dbPath = path.resolve(process.cwd(), dbFile);
console.log(`Database path: ${dbPath}`);
logger.info(`Database path: ${dbPath}`);
const db = new Database(dbPath);

db.run("PRAGMA journal_mode = WAL");
// https://sqlite.org/pragma.html#pragma_synchronous
// WAL mode is safe from corruption with synchronous=NORMAL, and probably DELETE mode is safe too on modern filesystems.
// WAL mode is always consistent with synchronous=NORMAL, but WAL mode does lose durability.
// A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash.
// You can also try OFF which is faster but less safe.
db.run("PRAGMA synchronous = NORMAL");
// https://www.sqlite.org/pragma.html#pragma_optimize
// Run PRAGMA OPTIMIZE every 6 hours using cron
if (process.env.NODE_ENV === "production") {
  const checkCronJob = $`crontab -l | grep -q "PRAGMA optimize"`;
  checkCronJob.then(() => {
    logger.info("Cron job for database optimization already exists");
  }).catch(() => {
    const cronJob = $`(crontab -l 2>/dev/null; echo "0 */6 * * * sqlite3 ${dbPath} 'PRAGMA optimize;'") | crontab -`;
    cronJob.then(() => {
      logger.info("Cron job for database optimization added successfully");
    }).catch((error) => {
      logger.error("Error setting up cron job for database optimization:", error);
    });
  });
}

const TodoQueries = {
  // Create a new todo item
  async createTodo(listId, title, description, dueDate, userId) {
    if (!userId) {
      logger.error("User ID is required to create a todo item");
      return { error: "User ID is required" };
    }
    const query = `INSERT INTO todo_items (list_id, title, description, due_date, user_id) 
                   VALUES (?, ?, ?, ?, ?)`;
    const stmt = db.prepare(query);
    logger.info(`Statement: ${stmt}`);
    const info = stmt.run(
      parseInt(listId, 10),
      title,
      description,
      dueDate,
      userId
    );
    return { id: info.lastInsertRowid };
  },

  // Read all todo items
  async getAllTodos(userId) {
    if (!userId) {
      logger.error("User ID is required to get all todo items");
      return { error: "User ID is required" };
    }
    const statement = db.prepare("SELECT * FROM todo_items WHERE user_id = ?");
    logger.info(`Statement: ${statement}`);
    return statement.all(userId);
  },

  // Read a single todo item by id
  async getTodoById(id, userId) {
    if (!userId) {
      logger.error("User ID is required to get a todo item by id");
      return { error: "User ID is required" };
    }
    const statement = db.prepare(
      "SELECT * FROM todo_items WHERE id = ? AND user_id = ?"
    );
    logger.info(`Statement: ${statement}`);
    return statement.get(id, userId);
  },

  // Update a todo item
  async updateTodo(id, title, description, isCompleted, dueDate, userId) {
    if (!userId) {
      logger.error("User ID is required to update a todo item");
      return { error: "User ID is required" };
    }
    const query = `UPDATE todo_items 
                   SET title = ?, description = ?, is_completed = ?, due_date = ? 
                   WHERE id = ? AND user_id = ?`;
    const isCompletedValue = isCompleted ? 1 : 0;
    const stmt = db.prepare(query);
    logger.info(`Statement: ${stmt}`);
    const info = stmt.run(
      title,
      description,
      isCompletedValue,
      dueDate,
      id,
      userId
    );
    return { changes: info.changes };
  },

  // Delete a todo item
  async deleteTodo(id, userId) {
    if (!userId) {
      logger.error("User ID is required to delete a todo item");
      return { error: "User ID is required" };
    }
    const stmt = db.prepare(
      "DELETE FROM todo_items WHERE id = ? AND user_id = ?"
    );
    logger.info(`Statement: ${stmt}`);
    const info = stmt.run(id, userId);
    return { changes: info.changes };
  },
};

export default TodoQueries;

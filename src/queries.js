import { Database } from 'bun:sqlite';
import path from 'path';

import { logger } from "./instrumentation.js";
const dbLocation = process.env.DATABASE_URL || 'sqlite:./data/mydb.sqlite';
const dbFile = dbLocation.replace('sqlite:', '');

// Resolve the path relative to the current directory
const dbPath = path.resolve(process.cwd(), dbFile);
const db = new Database(dbPath);

logger.info(`Database path: ${dbPath}`);

db.run('PRAGMA journal_mode = WAL');

const TodoQueries = {
  // Create a new todo item
  createTodo: (listId, title, description, dueDate, userId) => {
    if (!userId) {
      logger.error('User ID is required to create a todo item');
      return { error: 'User ID is required' };
    }
    const query = `INSERT INTO todo_items (list_id, title, description, due_date, user_id) 
                   VALUES (?, ?, ?, ?, ?)`;
    const stmt = db.prepare(query);
    logger.info(`Statement: ${stmt}`);
    const info = stmt.run(parseInt(listId, 10), title, description, dueDate, userId);
    return { id: info.lastInsertRowid };
  },

  // Read all todo items
  getAllTodos: (userId) => {
    if (!userId) {
      logger.error('User ID is required to get all todo items');
      return { error: 'User ID is required' };
    }
    const statement = db.prepare('SELECT * FROM todo_items WHERE user_id = ?');
    logger.info(`Statement: ${statement}`);
    return statement.all(userId);
  },

  // Read a single todo item by id
  getTodoById: (id, userId) => {
      if (!userId) {
      logger.error('User ID is required to get a todo item by id');
      return { error: 'User ID is required' };
    }
    const statement = db.prepare('SELECT * FROM todo_items WHERE id = ? AND user_id = ?');
    logger.info(`Statement: ${statement}`);
    return statement.get(id, userId);
  },

  // Update a todo item
  updateTodo: (id, title, description, isCompleted, dueDate, userId) => {
    if (!userId) {
      logger.error('User ID is required to update a todo item');
      return { error: 'User ID is required' };
    }
    const query = `UPDATE todo_items 
                   SET title = ?, description = ?, is_completed = ?, due_date = ? 
                   WHERE id = ? AND user_id = ?`;
    const isCompletedValue = isCompleted ? 1 : 0;
    const stmt = db.prepare(query);
    logger.info(`Statement: ${stmt}`);
    const info = stmt.run(title, description, isCompletedValue, dueDate, id, userId);
    return { changes: info.changes };
  },

  // Delete a todo item
  deleteTodo: (id, userId) => {
    if (!userId) {
      logger.error('User ID is required to delete a todo item');
      return { error: 'User ID is required' };
    }
    const stmt = db.prepare("DELETE FROM todo_items WHERE id = ? AND user_id = ?");
    logger.info(`Statement: ${stmt}`);
    const info = stmt.run(id, userId);
    return { changes: info.changes };
  }
};

export default TodoQueries;
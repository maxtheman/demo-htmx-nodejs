const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbLocation = process.env.DATABASE_URL || 'sqlite:./data/mydb.sqlite';
const dbFile = dbLocation.replace('sqlite:', '');

// Resolve the path relative to the current directory
const dbPath = path.resolve(process.cwd(), dbFile);

console.log("dbPath", dbPath);
const db = new sqlite3.Database(dbPath);

const TodoQueries = {
  // Create a new todo item
  createTodo: (listId, title, description, dueDate) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO todo_items (list_id, title, description, due_date) 
                     VALUES (?, ?, ?, ?)`;
      db.run(query, [listId, title, description, dueDate], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  },

  // Read all todo items
  getAllTodos: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM todo_items", [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  // Read a single todo item by id
  getTodoById: (id) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM todo_items WHERE id = ?", [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Update a todo item
  updateTodo: (id, title, description, isCompleted, dueDate) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE todo_items 
                     SET title = ?, description = ?, is_completed = ?, due_date = ? 
                     WHERE id = ?`;
      db.run(query, [title, description, isCompleted, dueDate, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  },

  // Delete a todo item
  deleteTodo: (id) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM todo_items WHERE id = ?", [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }
};

module.exports = TodoQueries;
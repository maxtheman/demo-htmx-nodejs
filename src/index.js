const express = require("express");
const path = require("path");
const TodoQueries = require("./queries");

const app = express();

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Serve static files (including htmx)
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/todos", async (req, res) => {
  try {
    const todos = await TodoQueries.getAllTodos();
    res.render("todos", { todos });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

app.post("/todos", async (req, res) => {
  const { listId, title, description, dueDate } = req.body;
  try {
    const result = await TodoQueries.createTodo(
      listId,
      title,
      description,
      dueDate
    );
    const newTodo = await TodoQueries.getTodoById(result.id);
    res.render("todo-item", { todo: newTodo });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

app.put("/todos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const todo = await TodoQueries.getTodoById(id);
    await TodoQueries.updateTodo(
      id,
      todo.title,
      todo.description,
      !todo.is_completed,
      todo.due_date
    );
    const refreshedTodo = await TodoQueries.getTodoById(id);
    res.render("todo-item", { todo: refreshedTodo });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

app.delete("/todos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await TodoQueries.deleteTodo(id);
    res.status(204).send();
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

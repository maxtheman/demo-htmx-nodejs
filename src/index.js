import { Hono } from "hono";
import { Eta } from "eta";
import TodoQueries from "./queries";
import { requiresAuth } from "./middleware/auth";
import { findDirectories, handleAsyncError, applyMiddleware } from "./utils";
import { logger } from "./instrumentation";

const app = new Hono();
const directories = await findDirectories();
applyMiddleware(app, directories);

const views = new Eta({
  views: directories.views,
  cache: true,
});

app.get("/", requiresAuth, async (c) => {
  logger.info({
    user: c.get("user")?.sub,
  });
  const html = views.render("index", { isAuthenticated: true });
  return c.html(html, 200);
});

app.get("/todos", requiresAuth, async (c) => {
  const [todos, getErr] = await handleAsyncError(() =>
    TodoQueries.getAllTodos(c.get("user")?.sub)
  );
  if (getErr) {
    return c.text("Error: " + getErr.message, 400);
  }
  const html = views.render("todos", { todos });
  return c.html(html, 200);
});

app.post("/todos", requiresAuth, async (c) => {
  const { listId, title, description, dueDate } = c.req.body;
  const [result, createErr] = await handleAsyncError(() =>
    TodoQueries.createTodo(
      listId,
      title,
      description,
      dueDate,
      c.get("user")?.sub
    )
  );
  if (createErr) {
    return c.text("Error: " + createErr.message, 400);
  }
  const [newTodo, getErr] = await handleAsyncError(() =>
    TodoQueries.getTodoById(result.id, c.get("user")?.sub)
  );
  if (getErr) {
    return c.text("Error: " + getErr.message, 400);
  }
  const html = views.render("todo-item", { todo: newTodo });
  return c.html(html, 200);
});

app.put("/todos/:id", requiresAuth, async (c) => {
  const { id } = c.req.param();
  const [todo, getErr] = await handleAsyncError(() =>
    TodoQueries.getTodoById(id, c.get("user")?.sub)
  );
  if (getErr) {
    return c.text("Error: " + getErr.message, 400);
  }
  const [updatedTodo, updateErr] = await handleAsyncError(() =>
    TodoQueries.updateTodo(
      id,
      todo.title,
      todo.description,
      !todo.is_completed,
      todo.due_date,
      c.get("user")?.sub
    )
  );
  if (updateErr) {
    return c.text("Error: " + updateErr.message, 400);
  }
  const [refreshedTodo, refreshErr] = await handleAsyncError(() =>
    TodoQueries.getTodoById(id, c.get("user")?.sub)
  );
  if (refreshErr) {
    return c.text("Error: " + refreshErr.message, 400);
  }
  const html = views.render("todo-item", { todo: refreshedTodo });
  return c.html(html, 200);
});

app.delete("/todos/:id", requiresAuth, async (c) => {
  const { id } = c.req.param();
  const [_, deleteErr] = await handleAsyncError(() =>
    TodoQueries.deleteTodo(id, c.get("user")?.sub)
  );
  if (deleteErr) {
    return c.text("Error: " + deleteErr.message, 400);
  }
  return c.text("", 200);
});

// Starting the server
app.fire();
logger.info(`Server is running on ${process.env.BASE_URL}`);

export default {
  port: 3000,
  fetch: app.fetch,
};

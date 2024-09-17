import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import path from "path";
import { Eta } from "eta";
import TodoQueries from "./queries";
import { requiresAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import { relative, dirname } from 'path';
import { fileURLToPath } from "url";
import { createRegExp, exactly, char, oneOrMore } from 'magic-regexp';
import { logger, opentelemetryMiddleware } from "./instrumentation";


const publicPathRegex = createRegExp(
  exactly('/public')
    .at.lineStart()
    .and(oneOrMore(char))
)

const app = new Hono();
app.use("*", opentelemetryMiddleware(logger));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://github.com/honojs/hono/issues/2200#issuecomment-2187240226
const relativePathToScript = relative(process.cwd(), __dirname);


const views = new Eta({
  views: path.join(__dirname, "views"),
  cache: true,
});

app.use('/public/*', serveStatic({
  root: relativePathToScript,
  onNotFound: (path, c) => {
    console.log(`${path} is not found, you access ${c.req.path}`)
  }
}));
app.use("*", async (c, next) => {
  if (publicPathRegex.test(c.req.url)) {
    return next();
  }
  const contentType = c.req.header("Content-Type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await c.req.parseBody();
    c.req.body = body;
  }
  await next();
});
// const handleAsyncError = async (fn) => {
//   // return [result, error]. If error is not null, it will be an error. If result is not null, it will be the result.
//   let result = null;
//   let error = null;
//   try {
//     result = await fn();
//     error = null;
//     return [result, null];
//   } catch (err) {
//     logger.error(err);
//     error = err;
//     return [null, err];
//   }
// };

// Mount authentication routes
app.route("/auth", authRoutes);

// Protected Routes
app.get("/", requiresAuth, async (c) => {
  logger.info({
    user: c.get("user")?.sub,
  });
  const html = views.render("index", { isAuthenticated: true });
  return c.html(html, 200);
});

app.get("/todos", requiresAuth, async (c) => {
  try {
    const todos = await TodoQueries.getAllTodos(c.get("user")?.sub);
    const html = views.render("todos", { todos });
    return c.html(html, 200);
  } catch (err) {
    return c.text("Error: " + err.message, 400);
  }
});

app.post("/todos", requiresAuth, async (c) => {
  const { listId, title, description, dueDate } = c.req.body;
  try {
    const result = await TodoQueries.createTodo(
      listId,
      title,
      description,
      dueDate,
      c.get("user")?.sub
    );
    const newTodo = await TodoQueries.getTodoById(
      result.id,
      c.get("user")?.sub
    );
    const html = views.render("todo-item", { todo: newTodo });
    return c.html(html, 200);
  } catch (err) {
    return c.text("Error: " + err.message, 400);
  }
});

app.put("/todos/:id", requiresAuth, async (c) => {
  const { id } = c.req.param();
  try {
    const todo = await TodoQueries.getTodoById(id, c.get("user")?.sub);
    const updatedTodo = await TodoQueries.updateTodo(
      id,
      todo.title,
      todo.description,
      !todo.is_completed,
      todo.due_date,
      c.get("user")?.sub
    );
    const refreshedTodo = await TodoQueries.getTodoById(id, c.get("user")?.sub);
    const html = views.render("todo-item", { todo: refreshedTodo });
    return c.html(html, 200);
  } catch (err) {
    return c.text("Error: " + err.message, 400);
  }
});

app.delete("/todos/:id", requiresAuth, async (c) => {
  const { id } = c.req.param();
  try {
    await TodoQueries.deleteTodo(id, c.get("user")?.sub);
    return c.text("", 200);
  } catch (err) {
    return c.text("Error: " + err.message, 400);
  }
});

// Starting the server
app.fire();

export default {
  port: 3000,
  fetch: app.fetch,
};

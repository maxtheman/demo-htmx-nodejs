import express from "express";
import path from "path";
import TodoQueries from "./queries.js";
import { logger } from "./instrumentation.js";
import { auth } from "express-openid-connect";
import { Eta } from "eta";

const app = express();

app.set("views", path.join(__dirname, "views"));

const views = new Eta({
  // Views directory path, using ETA renderer
  views: path.join(__dirname, "views"),
  cache: true,
});
// Serve static files (including htmx)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Auth0 configuration
const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_DOMAIN,
  secret: process.env.AUTH0_CLIENT_SECRET,
};

// Auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));
const requiresAuth = (req, res, next) => {
  // check if the user is authenticated, the middleware handles this with cookies.
  if (req.oidc.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

// utils, in future break out into a separate package
const render200 = (res, template, data) => {
  const view = views.render(template, data);
  return res.status(200).send(view);
};

const handleAsyncError = async (fn) => {
  // return [result, error]. If error is not null, it will be an error. If result is not null, it will be the result.
  let result = null;
  let error = null;
  try {
    result = await fn();
    error = null;
    return [result, null];
  } catch (err) {
    logger.error(err);
    error = err;
    return [null, err];
  }
};

app.get("/", requiresAuth, (req, res) => {
  logger.info({
    isAuthenticated: req.oidc.isAuthenticated(),
    user: req.oidc.user.sub,
  });
  return render200(res, "index", { isAuthenticated: req.oidc.isAuthenticated() });
});

app.get("/todos", requiresAuth, async (req, res) => {
  const [todos, err] = await handleAsyncError(() =>
    TodoQueries.getAllTodos(req.oidc.user.sub)
  );
  if (err) {
    return res.status(400).send("Error: " + err.message);
  }
  return render200(res, "todos", { todos: todos });
});

app.post("/todos", requiresAuth, async (req, res) => {
  const { listId, title, description, dueDate } = req.body;
  const [result, err] = await handleAsyncError(() =>
    TodoQueries.createTodo(
      listId,
      title,
      description,
      dueDate,
      req.oidc.user.sub
    )
  );
  if (err) {
    return res.status(400).send("Error: " + err.message);
  }
  const [newTodo, getError] = await handleAsyncError(() =>
    TodoQueries.getTodoById(result.id, req.oidc.user.sub)
  );
  if (getError) {
    logger.error(getError);
    return res.status(400).send("Error: " + getError.message);
  }
  render200(res, "todo-item", { todo: newTodo });
});

app.put("/todos/:id", requiresAuth, async (req, res) => {
  const { id } = req.params;
  const [todo, err] = await handleAsyncError(() =>
    TodoQueries.getTodoById(id, req.oidc.user.sub)
  );
  if (getError) {
    return res.status(400).send("Error: " + getError.message);
  }
  const [, updateErr] = await handleAsyncError(() =>
    TodoQueries.updateTodo(
      id,
      todo.title,
      todo.description,
      !todo.is_completed,
      todo.due_date,
      req.oidc.user.sub
    )
  );
  if (updateErr) {
    return res.status(400).send("Error: " + updateErr.message);
  }
  const [refreshedTodo, getError] = await handleAsyncError(() =>
    TodoQueries.getTodoById(id, req.oidc.user.sub)
  );
  if (getError) {
    return res.status(400).send("Error: " + getError.message);
  }
  render200(res, "todo-item", { todo: refreshedTodo });
});

app.delete("/todos/:id", requiresAuth, async (req, res) => {
  const { id } = req.params;
  const [result, err] = await handleAsyncError(() =>
    TodoQueries.deleteTodo(id, req.oidc.user.sub)
  );
  if (err) {
    return res.status(400).send("Error: " + err.message);
  }
  res.status(200).send("");
});

app.listen(3000, () => {
  logger.info("Server running on port 3000");
});

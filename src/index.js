import express from "express";
import path from "path";
import TodoQueries from "./queries.js";
import { logger } from "./instrumentation.js";
import { auth } from "express-openid-connect";

const app = express();

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Serve static files (including htmx)
app.use(express.static(path.join(__dirname, 'public')));
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
  res.redirect('/login');
};

app.get("/", requiresAuth, (req, res) => {
  logger.info({ isAuthenticated: req.oidc.isAuthenticated(), user: req.oidc.user.sub });
  res.render("index", { isAuthenticated: req.oidc.isAuthenticated() });
});
app.get("/profile", requiresAuth, (req, res) => {
  res.render("profile", { user: req.oidc.user });
});

app.get("/todos", requiresAuth, async (req, res) => {
  try {
    const todos = await TodoQueries.getAllTodos(req.oidc.user.sub);
    res.render("todos", { todos });
  } catch (err) {
    logger.error(err);
    res.status(400).send("Error: " + err.message);
  }
});

app.post("/todos", requiresAuth, async (req, res) => {
  const { listId, title, description, dueDate } = req.body;
  try {
    const result = TodoQueries.createTodo(
      listId,
      title,
      description,
      dueDate,
      req.oidc.user.sub
    );
    if (result.error) {
      logger.error(result.error);
      res.status(400).send("Error: " + result.error);
      return;
    }
    const newTodo = await TodoQueries.getTodoById(result.id, req.oidc.user.sub);
    res.render("todo-item", { todo: newTodo });
  } catch (err) {
    logger.error(err);
    res.status(400).send("Error: " + err.message);
  }
});

app.put("/todos/:id", requiresAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const todo = await TodoQueries.getTodoById(id, req.oidc.user.sub);
    TodoQueries.updateTodo(
      id,
      todo.title,
      todo.description,
      !todo.is_completed,
      todo.due_date,
      req.oidc.user.sub
    );
    const refreshedTodo = await TodoQueries.getTodoById(id, req.oidc.user.sub);
    res.render("todo-item", { todo: refreshedTodo });
  } catch (err) {
    logger.error(err);
    res.status(400).send("Error: " + err.message);
  }
});

app.delete("/todos/:id", requiresAuth, async (req, res) => {
  const { id } = req.params;
  try {
    TodoQueries.deleteTodo(id, req.oidc.user.sub);
    res.status(200).send('');
  } catch (err) {
    logger.error(err);
    res.status(400).send("Error: " + err.message);
  }
});

// Start server
app.listen(3000, () => {
  logger.info("Server running on port 3000");
});

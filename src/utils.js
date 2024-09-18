import { $ } from "bun";
import { relative, dirname } from "path";
import { fileURLToPath } from "url";
import { serveStatic } from "hono/bun";
import { logger, opentelemetryMiddleware } from "./instrumentation";
import { requiresAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";

import { createRegExp, exactly, char, oneOrMore } from "magic-regexp";

const publicPathRegex = createRegExp(
  exactly("/public").at.lineStart().and(oneOrMore(char))
);

export async function findDirectories() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const currentDir = await $`pwd`.text();
  const trimmedDir = currentDir.trim();

  const viewsDir =
    await $`find ${trimmedDir}/src -type d -name "views" | head -n 1`.text();
  const trimmedViewsDir = viewsDir.trim();

  const publicDir =
    await $`find ${trimmedDir}/src -type d -name "public" | head -n 1`.text();
  const trimmedPublicDir = publicDir.trim();

  const srcParentDir =
    await $`find ${trimmedDir} -type d -name "public" -not -path "*/node_modules/*" | head -n 1 | xargs dirname`.text();
  const trimmedSrcParentDir = srcParentDir.trim();

  return {
    views: trimmedViewsDir,
    public: trimmedPublicDir,
    srcParent: trimmedSrcParentDir,
    src: "src",
  };
}

export const handleAsyncError = async (fn) => {
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

export const applyMiddleware = (app, directories) => {
  app.use("*", opentelemetryMiddleware(logger));
  app.use(
    "/public/*",
    serveStatic({
      root: directories["src"],
      onNotFound: (path, c) => {
        console.log(`${path} is not found, you access ${c.req.path}`);
      },
    })
  );
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

  // Mount authentication routes
  app.route("/auth", authRoutes);
};

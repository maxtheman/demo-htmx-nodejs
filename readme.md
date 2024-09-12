# Demo Express + HTMX + SQLite Stack

This project demonstrates a simple setup for a web application using Express.js, HTMX, and SQLite.

## Philosophy

Mental model for picking this or any stack:
1. Do you have long-running CPU-bound or GPU-bound processes?
   - No? A simple, single lightweight CRUD server works for this.
   - Yes? You probably need both a web server and a heavier-duty worker machine with some kind of queue or serverless process to run your long-running processes.
2. Generally I would recommend Postgres for most database needs.
   - If you don't need RLS (row level security) or other Postgres features, then SQLite is a lightweight, partially file-based database engine that can also work well and so we used it here.
   - Traditionally, SQLite isn't picked for this but it's become more common and popular. You'll have better support with Postgres, but might get better latency with SQLite, and it would be simpler to administer.
3. You probably don't need an ORM
   - SQL isn't that hard to learn
   - You will very likely end up "ejecting" into SQL at some point using any ORM, increasing complexity.
   - ORMs don't save that much time, and many don't have built in migration tools, so you'd need to pick extra tools regardless, which may or may not work with your ORM.
   - You will have to re-represent your schema in both the ORM and in SQL anyway, most of the time. Doubling your work.
   - ORMs have lots of unique edge-cases and bugs you're taking on if you choose to pick an ORM.
   - That said, if you plan on changing you database in the future, you have very complex and dynamic queries, or you're just really not comfortable with SQL, maybe use an ORM.
   - It can also be a good idea to use an ORM if you are in a fullstack framework like Rails or Django, where ejecting from the ORM defeats the point of the framework.
4. Will you have lots of user-uploaded files?
   - If yes, setup Fly.io Tigris Storage for storage.
      - If you're not using Fly.io, then you might consider GCS, S3, or R2 for storage. R2 is the cheapest.
      - I'd recommend using s3fs to mount an S3 bucket on the file system if you need to access the files on your server, otherwise you can use AWS SDK to create signed urls for your files.
   - If no, then use a local volume which can either persist or not. For this project, we're using a SQLite database in a Fly Data Volume that persists across deployments.
5. Consider relying on an external auth provider.
   - This definitely saves you time when integrating with Google Auth, etc. Auth0 is a popular choice
      - https://auth0.com/docs/quickstart/webapp/express/interactive
   - If you're in a B2B setting, integrate WorkOS to get SSO for free, practically.
   - Otherwise, use SHA-256 and a secret to store passwords.
6. You might not need React.
   - Do you have a lot of complex UI interactions? Nested forms, lots of drag-and-drop, multiple users interacting with one page, timelines or workflows that move dynamically? If not — consider avoiding React.
   - As an alternative, check out HTMX w/ a templating engine (that's what I used here) or something like Phoenix Liveview in Elixir
7. Try tailwind for CSS.
   - Tailwind's utility classes small size and only packages what you need to the client. Easy to eject to plain CSS.
   - Avoids CSS-in-JS, which is trendy but can increase bundle size in a way that hurts performance and is harder to work with due to lack of flexibility when editing, i.e., it's harder to eject from.

## Prerequisites

- Node.js (version specified in `.nvmrc`)
- npm (Node Package Manager)
- nvm (Node Version Manager)

## Getting Started

Follow these steps to set up and run the project:

1. Use the correct Node.js version:
   ```
   nvm use
   ```
   This will use the Node.js version specified in the `.nvmrc` file.

2. Install dependencies:
   ```
   npm install
   ```
   This will install all the necessary packages defined in `package.json`.
3. Add the database url to .env and run the migrations
   ```
   touch .env
   echo "DATABASE_URL=mydb.sqlite" >> .env
   dbmate up
   ```
4. Start the server
   ```
   npm start
   ```

## Project Structure

- `index.js`: Main entry point for the Express application
- `package.json`: Defines project dependencies and scripts
- `Dockerfile`: Contains instructions for building a Docker image of the application
- `db/schema.sql`: Contains the schema for the database
- `db/migrations/`: Contains the migrations for the database
- `fly.toml`: Contains the configuration for the Fly.io platform

### Migrations

Migrations are handled with [dbmate](https://github.com/amacneil/dbmate).

To create a new migration, run:
```
dbmate -d mydb.sqlite new
```

### Docker

To build the Docker image, run:
```
docker build -t iggy-demo .
```

I recommend using https://orbstack.dev/download to build or run the container locally on Mac Silicon.

### Deploying to Fly.io

Install the Fly CLI and run the following commands:

```
fly auth login
fly launch
```


## Technologies Used

- [Express.js](https://expressjs.com/): Web application framework for Node.js
- [HTMX](https://htmx.org/): Lightweight library for AJAX, CSS Transitions, and WebSockets
- [SQLite](https://www.sqlite.org/): Lightweight, serverless database engine
- [EJS](https://ejs.co/): Templating engine for rendering HTML
- [Dbmate](https://github.com/amacneil/dbmate): Database migration tool
- [autoAnimate](https://auto-animate.formkit.com/): Animation library
- [Tailwind](https://tailwindcss.com/): CSS library

## Development

To start the server, run:
```
npm start
```

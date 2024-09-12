# Demo Express + HTMX + SQLite Stack

This project demonstrates a simple setup for a web application using Express.js, HTMX, and SQLite.

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
3. Setup the database
   ```
   touch mydb.sqlite
   sqlite3 mydb.sqlite < schema.sql
   ```
4. Start the server
   ```
   npm start
   ```

## Project Structure

- `index.js`: Main entry point for the Express application
- `package.json`: Defines project dependencies and scripts
- `Dockerfile`: Contains instructions for building a Docker image of the application

## Technologies Used

- [Express.js](https://expressjs.com/): Web application framework for Node.js
- [HTMX](https://htmx.org/): Lightweight library for AJAX, CSS Transitions, and WebSockets
- SQLite: Lightweight, serverless database engine

## Development

To start the development server, run:

FROM node:20-bullseye

RUN apt-get update && apt-get install -y sqlite3

WORKDIR /app

COPY package.json ./
RUN npm install
# rebuild sqlite3 for bullseye
RUN npm rebuild sqlite3

COPY ./src ./src
RUN mkdir -p ./db
COPY ./db/migrations ./db/migrations
COPY ./db/schema.sql ./db/

RUN mkdir -p /app/data && touch /app/data/mydb.sqlite
RUN chmod -R 777 /app/data
ENV DATABASE_URL=sqlite:./data/mydb.sqlite
RUN npm run db:migrate
# show tables
RUN sqlite3 /app/data/mydb.sqlite "select 1;"

EXPOSE 3000

CMD ["npm", "start"]
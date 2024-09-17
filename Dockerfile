FROM oven/bun:1

RUN apt-get update && apt-get install -y sqlite3 jq

WORKDIR /app

COPY package.json bun.lockb* ./

# Remove or override the prepare script before installing
RUN jq 'del(.scripts.prepare)' package.json > temp.json && mv temp.json package.json

RUN bun install

COPY ./src ./src
RUN mkdir -p ./db
COPY ./db/migrations ./db/migrations
COPY ./db/schema.sql ./db/
COPY src/instrumentation.js ./src/
COPY .env.production ./

EXPOSE 3000

COPY setupDb.sh /setupDb.sh
RUN chmod +x /setupDb.sh

ENTRYPOINT ["/setupDb.sh"]
CMD ["bun", "start"]